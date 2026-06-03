import React from 'react';
import { AgentConfig } from '../../types';
import { THEME } from '../../constants';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenVoice: () => void;
  onOpenResearch: () => void;
  activeAgent: AgentConfig;
  isThinking: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenVoice, onOpenResearch, activeAgent, isThinking }) => {
  return (
    <header className={`h-18 md:h-20 border-b border-white/5 flex items-center justify-between px-6 z-10 shrink-0 ${THEME.glass}`}>
      <div className="flex items-center gap-4">
         <button onClick={onToggleSidebar} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
           <i className="fas fa-bars"></i>
         </button>
         <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 text-${activeAgent.color}-400`}>
           <i className={`fas ${activeAgent.icon}`}></i>
         </div>
         <div className="hidden sm:block">
           <h1 className="font-black text-sm md:text-base text-white tracking-tight">{activeAgent.name}</h1>
           <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${isThinking ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></span>
             {isThinking ? 'جاري المعالجة...' : 'متصل ومستعد'}
           </p>
         </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenResearch}
          className="px-4 py-2 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 hover:from-amber-500/20 hover:to-indigo-500/20 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-black shadow-lg"
          title="افتح محرّر الأبحاث الأكاديمية وصانع الـ PDF"
        >
          <i className="fas fa-graduation-cap"></i>
          <span>منصة الأبحاث الـ PDF</span>
        </button>

        <button 
          onClick={onOpenVoice}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-500 flex items-center justify-center shadow-lg shadow-red-500/5 group"
          title="محادثة صوتية"
        >
          <i className="fas fa-microphone transition-transform group-hover:scale-110"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;