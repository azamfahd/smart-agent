import React, { useState, useEffect, useRef } from 'react';
import { AgentConfig, AgentRole } from '../../types';
import * as Constants from '../../constants';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  activeAgent: AgentConfig;
  isThinking: boolean;
  onSelectAgent: (id: AgentRole) => void;
  onGoHome: () => void;
  onRefresh?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNewChat, activeAgent, isThinking, onSelectAgent, onGoHome, onRefresh }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Click outside to close agent dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-10 shrink-0 bg-[#070b1c]/75 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070b1c]/40 font-sans shadow-sm">
      <div className="flex items-center gap-3 md:gap-4">
         <button onClick={onToggleSidebar} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm">
            <i className="fas fa-bars"></i>
         </button>
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setMenuOpen(prev => !prev)}
            className="flex items-center gap-2 md:gap-3 cursor-pointer p-1.5 md:p-2 rounded-xl hover:bg-white/5 transition-all select-none border border-transparent hover:border-white/10 active:scale-[0.98]"
          >
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-lg md:text-xl shadow-[0_4px_15px_rgba(245,158,11,0.15)] bg-gradient-to-br from-[#121b3d] to-[#060a1d] border border-white/10 text-amber-500 card-3d">
                <i className={`fas ${activeAgent.icon}`}></i>
             </div>
             <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                   <h1 className="font-extrabold text-sm md:text-base text-white tracking-tight">{activeAgent.name}</h1>
                   <i className={`fas fa-chevron-down text-[10px] text-slate-500 transition-transform duration-300 ${menuOpen ? 'rotate-180 text-amber-500' : ''}`}></i>
                   {activeAgent.id === AgentRole.ACADEMIC && (
                     <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] animate-pulse shrink-0">
                       <i className="fas fa-shield-alt"></i>
                       فحص موثّق
                     </span>
                   )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {activeAgent.id === AgentRole.ACADEMIC ? 'نظام الفحص الأكاديمي والتحري الميداني نشط' : 'تغيير الوكيل الذكي'}
                </p>
             </div>
          </div>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-[280px] bg-[#0a0f26]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-2.5 z-50 animate-fadeIn">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1.5 flex items-center gap-2">
                 <i className="fas fa-robot text-amber-500/70"></i> وكلاء الذكاء المتخصصون
               </div>
               <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 {Constants.AGENTS.map(agent => {
                   const isActive = activeAgent.id === agent.id;
                   return (
                      <button 
                        key={agent.id}
                        onClick={() => {
                           onSelectAgent(agent.id);
                           setMenuOpen(false);
                        }}
                        className={`flex items-center justify-between w-full p-2.5 rounded-lg transition-colors text-right ${
                          isActive 
                          ? 'bg-amber-500/10 text-amber-400 font-bold' 
                          : 'hover:bg-white/5 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs ${isActive ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                            <i className={`fas ${agent.icon}`}></i>
                          </div>
                          <span className="text-xs font-bold">{agent.name}</span>
                        </div>
                        {isActive && <i className="fas fa-check text-[10px]"></i>}
                      </button>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="w-8 h-8 md:w-10 md:h-10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all duration-300 flex items-center justify-center text-xs md:text-sm font-bold border border-white/5 active:scale-95"
            title="تحديث الصفحة"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        )}
        <button 
          onClick={onGoHome}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all duration-300 flex items-center gap-2 text-xs font-bold border border-white/5 active:scale-95"
          title="الرئيسية"
        >
          <i className="fas fa-home text-amber-500"></i>
          <span>الرئيسية</span>
        </button>
        <button 
          onClick={onNewChat}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all duration-300 flex items-center gap-2 text-xs font-bold border border-white/5 active:scale-95"
          title="محادثة جديدة"
        >
          <i className="fas fa-plus"></i>
          <span>جديد</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

