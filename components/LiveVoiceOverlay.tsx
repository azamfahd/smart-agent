
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { AgentConfig } from '../types';

interface LiveVoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentConfig;
}

const LiveVoiceOverlay: React.FC<LiveVoiceOverlayProps> = ({ isOpen, onClose, agent }) => {
  if (!isOpen) return null;

  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('جاري تهيئة الاتصال...');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    }
    return () => {
        stopLiveSession();
    };
  }, [isOpen]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startLiveSession = async () => {
    try {
      // Rule: Must create a new GoogleGenAI instance right before making an API call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      if (inputCtx.state === 'suspended') await inputCtx.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('متصل الآن - تحدث بحرية');
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // Rule: Solely rely on sessionPromise resolves.
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) {
              setTranscription(prev => prev + ' ' + msg.serverContent!.outputTranscription!.text);
            }
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const buffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              
              // Rule: Schedule the next audio chunk at nextStartTimeRef.
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => setStatus('خطأ في الاتصال'),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          systemInstruction: agent.systemInstruction,
          outputAudioTranscription: {},
        }
      });
    } catch (err) {
      console.error(err);
      setStatus('فشل في الوصول للميكروفون أو مفتاح API غير صالح');
    }
  };

  const stopLiveSession = () => {
    setIsActive(false);
    sourcesRef.current.forEach(s => s.stop());
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 overflow-hidden text-right" dir="rtl">
      <div className="absolute top-8 left-8">
        <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-red-500/20 transition-all">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="relative flex flex-col items-center gap-12 max-w-2xl w-full text-center">
        <div className="relative">
          <div className={`w-48 h-48 rounded-full bg-indigo-600/20 flex items-center justify-center relative z-10 border-2 border-indigo-500/30`}>
            <i className={`fas ${agent.icon} text-6xl text-indigo-400`}></i>
          </div>
          {isActive && (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping"></div>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse [animation-duration:2s]"></div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-tight">{agent.name}</h2>
          <p className={`text-lg font-bold tracking-widest ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>{status}</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 min-h-[180px] flex flex-col glass-morphism shadow-2xl">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">ترجمة المحادثة الفورية</p>
          <div className="flex-1 custom-scrollbar overflow-y-auto max-h-[120px]">
            <p className="text-slate-300 font-medium leading-relaxed italic text-lg">
              {transcription || "تحدث الآن.. سأقوم بترجمة صوتك وكلامي هنا"}
            </p>
          </div>
        </div>

        <button onClick={onClose} className="px-14 py-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-black shadow-[0_20px_50px_rgba(220,38,38,0.3)] transition-all flex items-center gap-3 active:scale-95 group">
          <i className="fas fa-phone-slash group-hover:rotate-12 transition-transform"></i> إنهاء الجلسة الصوتية
        </button>
      </div>
    </div>
  );
};

export default LiveVoiceOverlay;
