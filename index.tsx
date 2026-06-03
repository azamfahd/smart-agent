import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AgentRole, Message, AppSettings, ChatSession } from './types';
import { AGENTS, PROVIDERS_INFO } from './constants';
import { generateTextResponse, generateImage, generateVideo } from './services/geminiService';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import LiveVoiceOverlay from './components/LiveVoiceOverlay';
import MeshBackground from './components/MeshBackground';
import InstallBanner from './components/InstallBanner';
import ResearchWorkspace from './components/ResearchWorkspace';

// New Modular Components
import Header from './components/layout/Header';
import ChatArea from './components/chat/ChatArea';
import ChatInput from './components/chat/ChatInput';

declare const html2pdf: any;
declare const XLSX: any;

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ai-pro-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
    return {
      providers: {
        gemini: { apiKey: '', enabled: true, selectedModel: 'gemini-3-flash-preview' },
        openai: { apiKey: '', enabled: false, selectedModel: 'gpt-4o' },
        deepseek: { apiKey: '', enabled: false, selectedModel: 'deepseek-chat' },
        anthropic: { apiKey: '', enabled: false, selectedModel: 'claude-3-5-sonnet-20240620' },
        groq: { apiKey: '', enabled: false, selectedModel: 'llama-3.3-70b-versatile' },
        pollinations: { apiKey: '', enabled: true, selectedModel: 'openai' },
      },
      activeProvider: 'gemini',
      system: { language: 'ar', soundEnabled: true }
    };
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [researchInitialText, setResearchInitialText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ data: string, mimeType: string }[]>([]);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ai-pro-sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) {
        setActiveSessionId(parsed[0].id);
      } else {
        handleNewChat();
      }
    } else {
      handleNewChat();
    }

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setShowInstallBanner(true);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('ai-pro-sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ai-pro-settings', JSON.stringify(settings));
  }, [settings]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const activeAgent = useMemo(() => activeSession ? AGENTS.find(a => a.id === activeSession.agentId)! : AGENTS[0], [activeSession]);

  const handleNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'محادثة جديدة',
      agentId: AgentRole.GENERAL,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    let targetSessionId = activeSessionId;
    let fallbackSession: ChatSession | null = null;

    if (!targetSessionId) {
      if (sessions.length > 0) {
        targetSessionId = sessions[0].id;
        setActiveSessionId(targetSessionId);
      } else {
        const newId = Date.now().toString();
        fallbackSession = {
          id: newId,
          title: input.slice(0, 30) || 'محادثة جديدة',
          agentId: AgentRole.GENERAL,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        targetSessionId = newId;
        setActiveSessionId(newId);
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text',
      attachments: uploadedFiles.map(f => f.mimeType)
    };

    if (fallbackSession) {
      fallbackSession.messages.push(userMsg);
      setSessions(prev => [fallbackSession!, ...prev]);
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, userMsg],
            title: s.messages.length === 0 ? input.slice(0, 30) : s.title,
            updatedAt: new Date()
          };
        }
        return s;
      }));
    }

    const promptText = input;
    setInput('');
    const filesToSend = [...uploadedFiles];
    setUploadedFiles([]);
    setIsThinking(true);

    try {
      const lowerInput = promptText.toLowerCase();
      const isImageRequest = /(ارسم|صورة|تخيل|توليد صورة|صمم صورة|رسم|img|image|draw|paint|generate image|create image)/i.test(lowerInput);
      const isVideoRequest = /(فيديو|انشئ فيديو|صناعة فيديو|صمم فيديو|video|create video|generate video)/i.test(lowerInput);

      let aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        type: 'text'
      };

      if (isImageRequest) {
        const imagePrompt = promptText.replace(/(ارسم لي|ارسم|صورة لـ|صورة|تخيل|توليد صورة|صمم صورة|رسم|img|image|draw|paint|generate image|create image)\s*/gi, '').trim() || promptText;
        const imageUrl = await generateImage(imagePrompt);
        aiMsg.type = 'image';
        aiMsg.imageUrl = imageUrl;
        aiMsg.content = `تم توليد الصورة بناءً على طلبك: "${imagePrompt}"`;
      } else if (isVideoRequest) {
        const videoPrompt = promptText.replace(/(فيديو لـ|فيديو|انشئ فيديو|صناعة فيديو|صمم فيديو|video|create video|generate video)\s*/gi, '').trim() || promptText;
        const videoUrl = await generateVideo(videoPrompt);
        aiMsg.type = 'video';
        aiMsg.videoUrl = videoUrl;
        aiMsg.content = `تم إنشاء الفيديو: "${videoPrompt}"`;
      } else {
        const currentSessionObj = fallbackSession || sessions.find(s => s.id === targetSessionId);
        const previousMessages = currentSessionObj ? currentSessionObj.messages : [];
        const history = previousMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));
        
        const response = await generateTextResponse(
          promptText,
          activeAgent.id,
          activeAgent.systemInstruction,
          history as any,
          filesToSend,
          settings
        );
        
        aiMsg.content = response.text;
        aiMsg.sources = response.sources;
        aiMsg.modelName = response.modelName;
      }

      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));

    } catch (error: any) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ عذراً، حدث خطأ: ${error.message}`,
        timestamp: new Date(),
        type: 'text'
      };
      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s));
    } finally {
      setIsThinking(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadedFiles(prev => [...prev, { data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = (type: 'pdf' | 'word' | 'excel', target: string) => {
    if (type === 'word') {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Tajawal', sans-serif; direction: rtl; text-align: justify; line-height: 1.6; padding: 20px; }</style></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + target.replace(/\n/g, "<br>") + footer;
      const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
      const link = document.createElement("a");
      link.href = source;
      link.download = `document-${Date.now()}.doc`;
      link.click();
    } else if (type === 'pdf') {
      const element = document.getElementById(target);
      if (!element || typeof html2pdf === 'undefined') return;
      
      // Build a premium, elegantly formatted print layouts for PDF
      const tempContainer = document.createElement('div');
      tempContainer.style.background = '#ffffff';
      tempContainer.style.color = '#0f172a';
      tempContainer.style.padding = '30px';
      tempContainer.style.fontFamily = "'Tajawal', sans-serif";
      tempContainer.style.direction = 'rtl';
      tempContainer.style.textAlign = 'right';
      
      // Determine styling and labels based on the active agent
      let agentDocType = "البحث العلمي &bull; تقرير تقني موثق";
      let agentIdentity = activeAgent.name || "الوكيل المساعد الموثق (Agent Hub)";
      let signature = "وثيقة رسمية معتمدة ومصدرة رقمياً بواسطة النظم الأكاديمية الذكية &copy; 2026";
      let mainColor = "#3b82f6"; // Default Blue
      let iconHtml = '<i class="fas fa-brain"></i>';
      
      if (activeAgent.id === 'CODER') {
         agentDocType = "مستند تقني &bull; توثيق أكواد وهندسة برمجيات";
         signature = "وثيقة تقنية مصدرة رقمياً بواسطة مساعد البرمجيات الذكي";
         mainColor = "#0ea5e9";
         iconHtml = '<i class="fas fa-laptop-code"></i>';
      } else if (activeAgent.id === 'ACADEMIC') {
         agentDocType = "ورقة أكاديمية &bull; تقرير علمي موثق";
         signature = "وثيقة علمية مراجعة ومصدرة رقمياً بواسطة الباحث الأكاديمي";
         mainColor = "#10b981";
         iconHtml = '<i class="fas fa-user-graduate"></i>';
      } else if (activeAgent.id === 'CREATIVE' || activeAgent.id === 'VIDEO') {
         agentDocType = "توصيف إبداعي &bull; تصورات وتصاميم فنية";
         signature = "وثيقة تصميم مصدرة بواسطة مساعد التصميم والفنون";
         mainColor = "#f59e0b";
         iconHtml = '<i class="fas fa-palette"></i>';
      }

      // Premium formatted header with dynamic colors
      tempContainer.innerHTML = `
        <div style="border-bottom: 3px solid ${mainColor}20; padding-bottom: 20px; margin-bottom: 35px; display: flex; justify-content: space-between; align-items: flex-end; font-family: 'Tajawal', sans-serif;">
          <div>
             <div style="font-size: 11px; color: ${mainColor}; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 6px;">${agentDocType}</div>
             <div style="font-size: 20px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                <span style="color: ${mainColor}; font-size: 18px;">${iconHtml}</span>
                <span>${agentIdentity}</span>
             </div>
          </div>
          <div style="text-align: left;">
             <div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">تاريخ التوليد والإصدار</div>
             <div style="font-size: 13px; font-weight: 700; color: #334155;">${new Date().toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
        
        <style>
          .print-doc-body pre { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; padding: 10px !important; border-radius: 8px !important; white-space: pre-wrap !important; word-wrap: break-word !important; }
          .print-doc-body code { color: ${mainColor} !important; font-weight: bold; }
          .print-doc-body table { width: 100% !important; border-collapse: collapse !important; margin: 20px 0 !important; }
          .print-doc-body th, .print-doc-body td { border: 1px solid #e2e8f0 !important; padding: 10px !important; text-align: right !important; }
          .print-doc-body th { background: ${mainColor}10 !important; color: ${mainColor} !important; }
          .print-doc-body blockquote { border-right: 4px solid ${mainColor} !important; padding-right: 15px !important; margin: 15px 0 !important; color: #475569 !important; background: #f8fafc !important; padding-top: 10px !important; padding-bottom: 10px !important;}
        </style>
        <div class="print-doc-body" style="font-size: 13px; line-height: 1.9; text-align: justify; color: #1e293b; padding: 0 10px;">
          ${element.innerHTML}
        </div>
        
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
           <div style="font-size: 9px; color: #94a3b8; font-style: italic;">${signature}</div>
           <div style="width: 40px; height: 40px; border-radius: 50%; background: ${mainColor}10; display: flex; align-items: center; justify-content: center; color: ${mainColor}; font-size: 16px;">
             ${iconHtml}
           </div>
        </div>
      `;

      // Clean all buttons or helper copy buttons inside printable clone to avoid ugly buttons inside the pdf
      const controls = tempContainer.querySelectorAll('button, .opacity-40, .w-8, .mr-4\\, .list-disc');
      controls.forEach(c => c.remove());

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `academic-document-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(tempContainer).save();
    } else if (type === 'excel') {
      if (typeof XLSX === 'undefined') return;
      
      let dataAOA: any[][] = [];
      
      // Professional Table Extraction
      if (target.includes('|')) {
        const lines = target.split('\n');
        lines.forEach(line => {
          if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            if (line.includes('---')) return; // skip separating lines (e.g. |---|---|)
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            dataAOA.push(cells);
          }
        });
      }
      
      // Tab/Comma parsing fallback
      if (dataAOA.length === 0) {
        const lines = target.split('\n');
        lines.forEach(line => {
          const l = line.trim();
          if (l === '') return;
          if (l.includes('\t')) {
            dataAOA.push(l.split('\t').map(c => c.trim()));
          } else if (l.includes(',')) {
            dataAOA.push(l.split(',').map(c => c.trim()));
          } else {
            dataAOA.push([l]);
          }
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(dataAOA.length > 0 ? dataAOA : [[target]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `academic-table-${Date.now()}.xlsx`);
    }
  };

  const downloadMedia = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-[100dvh] text-slate-200 font-sans overflow-hidden relative selection:bg-indigo-500/30">
      <MeshBackground />

      <Sidebar 
        activeSessionId={activeSessionId}
        sessions={sessions}
        onSelectSession={(id) => { setActiveSessionId(id); setSidebarOpen(false); }}
        onNewChat={handleNewChat}
        onDeleteSession={(id, e) => {
          e.stopPropagation();
          setSessions(prev => prev.filter(s => s.id !== id));
          if (activeSessionId === id) setActiveSessionId(null);
        }}
        onOpenSettings={() => setShowSettings(true)}
        activeProviderName={PROVIDERS_INFO[settings.activeProvider].name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAgentId={activeAgent.id}
        onSelectAgent={(agentId) => {
          if (!activeSessionId) return;
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, agentId } : s));
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#020617]/30 relative transition-all duration-300">
        <Header 
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenVoice={() => setShowVoice(true)}
          onOpenResearch={() => { setResearchInitialText(''); setShowResearch(true); }}
          activeAgent={activeAgent}
          isThinking={isThinking}
        />

        <ChatArea 
          messages={activeSession?.messages || []}
          activeAgent={activeAgent}
          isThinking={isThinking}
          onExport={handleExport}
          onDownloadMedia={downloadMedia}
          onSuggestionClick={(s) => setInput(s)}
          onSendToResearch={(text) => { setResearchInitialText(text); setShowResearch(true); }}
          onSelectAgent={(agentId) => {
            if (!activeSessionId) return;
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, agentId } : s));
          }}
        />

        <ChatInput 
          input={input}
          setInput={setInput}
          onSend={handleSendMessage}
          isThinking={isThinking}
          uploadedFiles={uploadedFiles}
          onFileDelete={(idx) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
          onFileUpload={handleFileUpload}
        />
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
      />

      <LiveVoiceOverlay 
        isOpen={showVoice} 
        onClose={() => setShowVoice(false)}
        agent={activeAgent}
      />

      <ResearchWorkspace 
        isOpen={showResearch} 
        onClose={() => setShowResearch(false)} 
        settings={settings} 
        initialText={researchInitialText} 
        activeAgent={activeAgent}
      />

      {showInstallBanner && <InstallBanner onInstall={() => (window as any).promptInstall?.prompt()} onDismiss={() => setShowInstallBanner(false)} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);