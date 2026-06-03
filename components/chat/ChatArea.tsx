import React, { useRef, useEffect } from 'react';
import { Message, AgentConfig, AgentRole } from '../../types';
import MessageItem from './MessageItem';
import { AGENTS } from '../../constants';

interface ChatAreaProps {
  messages: Message[];
  activeAgent: AgentConfig;
  isThinking: boolean;
  onExport: (type: 'pdf' | 'word' | 'excel', msgIdOrContent: string) => void;
  onDownloadMedia: (url: string, filename: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onSendToResearch?: (text: string) => void;
  onSelectAgent?: (id: AgentRole) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  activeAgent, 
  isThinking, 
  onExport, 
  onDownloadMedia, 
  onSuggestionClick, 
  onSendToResearch,
  onSelectAgent
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Color mapping matching Sidebar
  const agentColors: Record<string, { ring: string, text: string, bg: string, border: string, glow: string }> = {
    indigo: { ring: 'ring-indigo-500/20', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', glow: 'shadow-indigo-500/10' },
    emerald: { ring: 'ring-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
    purple: { ring: 'ring-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/10' },
    amber: { ring: 'ring-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
    sky: { ring: 'ring-sky-500/20', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', glow: 'shadow-sky-500/10' },
  };

  const getAgentTheme = (color: string) => agentColors[color] || agentColors.indigo;
  const currentTheme = getAgentTheme(activeAgent.color);

  // Suggested Prompts structured beautifully with descriptions and icons
  const suggestionCards = [
    {
      text: 'لخص لي هذا المقال الطويل واستخرج الأطروحة والنتائج',
      category: 'أكاديمي وتحليلي',
      icon: 'fa-file-signature',
      badge: 'تحليل نصوص',
      color: 'emerald',
      agentId: AgentRole.ACADEMIC
    },
    {
      text: 'اكتب كود كامل لتطبيق ويب بسيط باستخدام React مع شرح الهيكل',
      category: 'برمجة احترافية',
      icon: 'fa-code',
      badge: 'كود نظيف',
      color: 'sky',
      agentId: AgentRole.CODER
    },
    {
      text: 'أنشئ صورة سينمائية مذهلة لمدينة الرياض المستقبلية ذات طابع معلق بالهواء',
      category: 'توليد فني وصور',
      icon: 'fa-image',
      badge: 'جودة مذهلة',
      color: 'amber',
      agentId: AgentRole.CREATIVE
    },
    {
      text: 'تحويل دراسة جدوى إلى ملف PDF علمي منسق ومقسم',
      category: 'منصة الأبحاث الـ PDF',
      icon: 'fa-graduation-cap',
      badge: 'أبحاث وتقارير',
      color: 'indigo',
      agentId: AgentRole.GENERAL
    }
  ];

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar p-6 md:p-12 space-y-12 pb-24">
        {/* Banner with Glowing Ring and Interactive Logo */}
        <div className="flex flex-col items-center text-center mt-6">
          <div className={`relative w-28 h-28 rounded-[2.2rem] bg-gradient-to-tr from-slate-900 to-[#1e293b] border-2 border-white/10 flex items-center justify-center text-5xl ${currentTheme.text} shadow-2xl transition-all duration-500 hover:scale-105 group`}>
            <i className={`fas ${activeAgent.icon} transition-transform duration-500 group-hover:rotate-12`}></i>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeAgent.color === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${activeAgent.color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500/10 to-indigo-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider animate-fadeIn">
              <i className="fas fa-brain animate-pulse"></i> نظام الوكيل الذكي المتعدد • Hub
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-normal font-sans">
              واجهة العمل الموحدة للذكاء الاصطناعي
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              المساعد الاحترافي مدمج بكافة المزايا: تحويل الأفكار إلى أبحاث PDF، توليد الصور الفنية، صياغة الأكواد التقنية، ومحادثات ذكية فورية.
            </p>
          </div>

          {/* Secure / Free Badge */}
          <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 px-4 py-2.5 rounded-2xl text-xs font-black mx-auto mt-5 shadow-lg select-none">
            <i className="fas fa-check-circle animate-pulse text-[14px]"></i>
            <span>المنصة مجانية ومفتوحة بالكامل ودون قيود • بدون حاجة لمفاتيح API</span>
          </div>
        </div>

        {/* 1. AGENT INTERACTIVE CHOICE HUB */}
        <div className="w-full max-w-4xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-black text-slate-300 flex items-center gap-2">
              <i className="fas fa-cubes text-indigo-400"></i>
              <span>اختر التخصص النشط للعميل قبل البدء</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">انقر للتغيير الفوري</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {AGENTS.map((agent) => {
              const styles = getAgentTheme(agent.color);
              const isActive = activeAgent.id === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent && onSelectAgent(agent.id)}
                  className={`p-4 rounded-3xl border transition-all duration-300 text-right flex flex-col justify-between h-32 relative overflow-hidden group ${
                    isActive 
                    ? `bg-gradient-to-br from-slate-900 to-#0a1329 ${styles.border} ${styles.glow} ring-2 ring-indigo-500/20` 
                    : 'bg-[#1e293b]/20 hover:bg-[#1e293b]/40 border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${isActive ? `${styles.bg} ${styles.text}` : 'bg-white/5 text-slate-500 group-hover:text-slate-300 transition-colors'}`}>
                      <i className={`fas ${agent.icon}`}></i>
                    </div>
                    {isActive && (
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>{agent.name}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-medium truncate">{agent.description}</p>
                  </div>

                  {isActive && <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-amber-500 animate-pulse"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. DYNAMIC PREMIUM SUGGESTIONS */}
        <div className="w-full max-w-4xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-black text-slate-300 flex items-center gap-2">
              <i className="fas fa-magic text-yellow-400"></i>
              <span>مقترحات ذكية لتجربتها بثوانٍ معدودة</span>
            </h3>
            <span className="text-[10px] text-indigo-400 font-black">أكثر الأوامر استخداماً</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestionCards.map((card, i) => {
              const bgBadge = card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                              card.color === 'sky' ? 'bg-sky-500/10 text-sky-400' :
                              card.color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400';
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (onSelectAgent && card.agentId) {
                      onSelectAgent(card.agentId);
                    }
                    onSuggestionClick(card.text);
                  }}
                  className="p-5 text-right rounded-3xl bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 hover:border-white/10 transition-all duration-300 flex items-start gap-4 group hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${bgBadge} shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-md`}>
                    <i className={`fas ${card.icon}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-black text-slate-300">{card.category}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${bgBadge}`}>{card.badge}</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-400 group-hover:text-slate-100 transition-colors leading-relaxed font-black truncate">{card.text}</p>
                    <span className="text-[10px] text-indigo-400/0 group-hover:text-indigo-400/100 font-bold transition-all flex items-center gap-1.5 mt-2.5">
                      انقر لتنفيذ هذا الأمر الفوري <i className="fas fa-arrow-left text-[8px]"></i>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>


      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 scroll-smooth">
      <div className="max-w-4xl mx-auto">
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id} 
            msg={msg} 
            activeAgent={activeAgent}
            onExport={onExport} 
            onDownloadMedia={onDownloadMedia}
            onSendToResearch={onSendToResearch}
          />
        ))}
        {isThinking && (
          <div className="flex items-center gap-4 animate-pulse px-6 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xs shadow-inner">
              <i className="fas fa-robot"></i>
            </div>
            <div className="text-sm text-emerald-400 font-bold tracking-widest">جاري صياغة الرد...</div>
          </div>
        )}
        <div ref={chatEndRef} className="h-4" />
      </div>
    </div>
  );
};

export default ChatArea;