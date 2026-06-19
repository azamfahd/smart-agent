import React, { useRef, useEffect } from 'react';
import { Message, AgentConfig, AgentRole } from '../../types';
import MessageItem from './MessageItem';
import { AGENTS } from '../../constants';

interface ChatAreaProps {
  messages: Message[];
  activeAgent: AgentConfig;
  isThinking: boolean;
  onExport: (type: 'word' | 'excel' | 'pdf', msgIdOrContent: string) => void;
  onDownloadMedia: (url: string, filename: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onSelectAgent?: (id: AgentRole) => void;
  onResetChat?: () => void;
  hasActiveSession?: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  activeAgent, 
  isThinking, 
  onExport, 
  onDownloadMedia, 
  onSuggestionClick, 
  onSelectAgent,
  onResetChat,
  hasActiveSession = false
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Color mapping matching Sidebar with dynamic glowing elements
  const agentColors: Record<string, { ring: string, text: string, bg: string, border: string, glow: string }> = {
    indigo: { ring: 'ring-indigo-500/20', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', glow: 'neon-glow-indigo' },
    emerald: { ring: 'ring-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'neon-glow-emerald' },
    purple: { ring: 'ring-purple-500/20', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'neon-glow-purple' },
    amber: { ring: 'ring-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: 'neon-glow-amber' },
    sky: { ring: 'ring-sky-500/20', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', glow: 'neon-glow-sky' },
  };

  const getAgentTheme = (color: string) => agentColors[color] || agentColors.indigo;
  const currentTheme = getAgentTheme(activeAgent.color);

  // Dynamic specialized suggestions based on active agent role
  const getAgentSuggestions = (role: AgentRole) => {
    switch (role) {
      case AgentRole.ACADEMIC:
        return [
          {
            text: 'اكتب لي خطة بحث أكاديمي متكاملة حول الذكاء الاصطناعي في التعليم',
            icon: 'fa-book-reader',
            category: 'منهجية البحث العلمي',
            color: 'emerald'
          },
          {
            text: 'قارن في جدول علمي دقيق ومفصل بين بنية الشبكات العصبية والتوليدية العميقة',
            icon: 'fa-table',
            category: 'مقارنة فنية منسقة',
            color: 'emerald'
          },
          {
            text: 'صغ واشرح مقدمة ممتازة لبحث أكاديمي يتناول استدامة الطاقة النظيفة ومستقبلها في المملكة',
            icon: 'fa-graduation-cap',
            category: 'صياغة أكاديمية رصينة',
            color: 'emerald'
          }
        ];
      case AgentRole.CODER:
        return [
          {
            text: 'اكتب كود TypeScript كامل لإنشاء خادم Express آمن وموثوق مع شرح الهيكل بالتفصيل',
            icon: 'fa-code-branch',
            category: 'تطوير الخوادم والنظم',
            color: 'sky'
          },
          {
            text: 'راجع هذا الكود البرمجي وابحث عن أي ثغرات أمنية أو أخطاء محتملة لتحسينه واختصاره',
            icon: 'fa-bug',
            category: 'تحسين وثوقية الكود',
            color: 'sky'
          },
          {
            text: 'كيف يمكنني تحسين أداء استعلامات قاعدة البيانات الكبيرة في تطبيق React مع منع التكرار؟',
            icon: 'fa-tachometer-alt',
            category: 'مستوى الأداء والسرعة',
            color: 'sky'
          }
        ];
      case AgentRole.CREATIVE:
        return [
          {
            text: 'ارسم لوحة فنية سريالية لدمج الطبيعة الخضراء المورقة مع ناطحات السحاب المستقبلية المضيئة بأسلوب مذهل',
            icon: 'fa-paint-brush',
            category: 'توليد صور فنية',
            color: 'amber'
          },
          {
            text: 'تخيل ووصف شعاراً تجارياً مبتكراً وبسيطاً (Minimalist Logo) يناسب شركة ذكاء اصطناعي سعودية ناشئة',
            icon: 'fa-pen-nib',
            category: 'ابتكار الهويات الفنية',
            color: 'amber'
          },
          {
            text: 'صمم صورة خلفية سينمائية فائقة الدقة بتفاصيل الخيال العلمي لصحراء الرياض المتطورة فضائياً',
            icon: 'fa-mountain',
            category: 'خلفيات إبداعية ممتازة',
            color: 'amber'
          }
        ];
      case AgentRole.VIDEO:
        return [
          {
            text: 'أنشئ مشهد فيديو سينمائي لرائد فضاء يكتشف بوابة كوزمية مشعة متوهجة في أعماق المجرة المظلمة',
            icon: 'fa-film',
            category: 'خيال سينمائي متطور',
            color: 'purple'
          },
          {
            text: 'صناعة عرض فيديو ترويجي قصير ومبهر يوضح جمال وسحر جبال السودة المغطاة بالغيوم والضباب',
            icon: 'fa-clapperboard',
            category: 'مشاهد سياحية طبيعية',
            color: 'purple'
          },
          {
            text: 'مشهد فيديو عالي الدقة يوضح تدفق البيانات الملونة السريعة داخل معالج حاسوب كمومي نشط',
            icon: 'fa-network-wired',
            category: 'تقنيات الفيديو الرقمي',
            color: 'purple'
          }
        ];
      default:
        return [
          {
            text: 'لخص لي هذا الكتاب أو الوثيقة الطويلة وقدم أهم النتائج والتوصيات الفورية في نقاط',
            icon: 'fa-file-alt',
            category: 'تلخيص وتحليل ذكي',
            color: 'indigo'
          },
          {
            text: 'صمم لي خطة عمل تفصيلية ومرحلية لإطلاق مشروع تقني ناشئ ومجدٍ تجارياً في السوق المحلي',
            icon: 'fa-lightbulb',
            category: 'استشارات وتطوير أعمال',
            color: 'indigo'
          },
          {
            text: 'اكتب مقالاً طويلاً ومقنعاً عن مستقبل الذكاء الاصطناعي بلغة عربية بليغة وجذابة وملهمة',
            icon: 'fa-pen-alt',
            category: 'صناعة وتحرير المحتوى',
            color: 'indigo'
          }
        ];
    }
  };

  if (messages.length === 0) {
    const accentCol = activeAgent.color === 'emerald' ? 'emerald' : activeAgent.color === 'purple' ? 'purple' : activeAgent.color === 'sky' ? 'sky' : activeAgent.color === 'amber' ? 'amber' : 'indigo';
    const activeGlow = activeAgent.color === 'emerald' ? 'neon-glow-emerald' : activeAgent.color === 'purple' ? 'neon-glow-purple' : activeAgent.color === 'sky' ? 'neon-glow-sky' : activeAgent.color === 'amber' ? 'neon-glow-amber' : 'neon-glow-indigo';
    const suggestions = getAgentSuggestions(activeAgent.id);

    return (
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar p-6 md:p-16 space-y-12 pb-32 animate-fade-in select-none">
        
        {/* UPPER STATUS CARD */}
        <div className="flex flex-col items-center text-center mt-4">
          <div className={`relative w-24 h-24 rounded-3xl bg-[#0d1430]/80 border border-white/10 flex items-center justify-center text-5xl text-${accentCol}-400 shadow-[0_12px_44px_rgba(0,0,0,0.6)] transition-all duration-500 hover:scale-105 group card-3d ${activeGlow}`}>
            <i className={`fas ${activeAgent.icon} transition-transform duration-500 group-hover:rotate-12`}></i>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeAgent.color === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-4 w-4 ${activeAgent.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-${accentCol}-500/10 text-${accentCol}-400 border border-${accentCol}-500/20 uppercase tracking-widest`}>
              <i className="fas fa-snowflake animate-spin text-[10px]"></i> منصة العمل الذكية • {activeAgent.name}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight font-sans">
              {hasActiveSession ? `أنت تتواصل الآن مع: ${activeAgent.name}` : "واجهة المساعد الموحد الذكي"}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              {hasActiveSession ? activeAgent.description : "المساعد الاحترافي مدمج بكافة المزايا: تحويل الأفكار إلى أبحاث، توليد الصور، وكتابة الأكواد التقنية الاحترافية."}
            </p>
          </div>
        </div>

        {/* COMPACT ACTIVE SWITCH BAR - Available always so users can click & switch right away */}
        <div className="w-full max-w-3xl space-y-4 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fas fa-project-diagram text-indigo-400"></i> التبديل المباشر بين تخصصات الوكلاء
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {AGENTS.map((agent) => {
              const isActive = activeAgent.id === agent.id;
              const col = agent.color === 'emerald' ? 'emerald' : agent.color === 'purple' ? 'purple' : agent.color === 'sky' ? 'sky' : agent.color === 'amber' ? 'amber' : 'indigo';
              const glow = agent.color === 'emerald' ? 'neon-glow-emerald' : agent.color === 'purple' ? 'neon-glow-purple' : agent.color === 'sky' ? 'neon-glow-sky' : agent.color === 'amber' ? 'neon-glow-amber' : 'neon-glow-indigo';
              
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent && onSelectAgent(agent.id)}
                  className={`py-2 px-3 rounded-xl border text-right transition-all duration-300 flex items-center gap-2 group relative overflow-hidden ${
                    isActive 
                    ? `bg-[#0d1430] border-${col}-500/50 ${glow} text-white` 
                    : 'bg-[#0d1430]/30 hover:bg-[#111a3d]/60 border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] border shrink-0 ${isActive ? `bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent` : 'bg-slate-950/50 border-white/5'}`}>
                    <i className={`fas ${agent.icon}`}></i>
                  </div>
                  <span className="text-[11px] font-extrabold truncate">{agent.name.split(' ')[0]}</span>
                  {isActive && (
                    <span className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* AGENT-SPECIFIC SUGGESTIONS BOARD */}
        <div className="w-full max-w-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h3 className="text-xs font-black text-slate-200 flex items-center gap-2">
              <i className="fas fa-magic text-indigo-400 text-[10px]"></i>
              <span>خيارات ومقترحات سريعة لـ {activeAgent.name}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {suggestions.map((card, i) => {
              const themeStyles = card.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                             card.color === 'sky' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                             card.color === 'purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                             card.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/10' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
              return (
                <button
                  key={i}
                  onClick={() => {
                    onSuggestionClick(card.text);
                  }}
                  className="p-4 md:p-5 text-right rounded-2xl bg-[#0d1430]/40 hover:bg-[#111a3d]/80 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between min-h-[110px] md:min-h-[130px] overflow-hidden group shadow-[0_4px_20px_rgba(0,0,0,0.15)] card-3d relative"
                >
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-xs md:text-sm border shrink-0 ${themeStyles}`}>
                    <i className={`fas ${card.icon}`}></i>
                  </div>
                  <div className="w-full mt-2.5 md:mt-3 min-w-0">
                    <p className="text-xs md:text-sm text-slate-200 font-bold leading-relaxed line-clamp-2 md:line-clamp-3">{card.text}</p>
                    <span className="text-[9px] md:text-[10px] text-slate-500 font-black mt-1.5 flex items-center gap-1 uppercase tracking-widest">
                      <i className="fas fa-bolt text-indigo-400 text-[7px]" /> {card.category}
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
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-8 scroll-smooth w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id} 
            msg={msg} 
            activeAgent={activeAgent}
            onExport={onExport} 
            onDownloadMedia={onDownloadMedia}
          />
        ))}
        {isThinking && (
          <div className="flex items-center gap-4 animate-pulse px-6 py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs shadow-inner">
              <i className="fas fa-robot"></i>
            </div>
            <div className="text-sm text-emerald-400 font-black tracking-widest">جاري صياغة الرد المعرفي...</div>
          </div>
        )}
        <div ref={chatEndRef} className="h-4" />
      </div>
    </div>
  );
};

export default ChatArea;
