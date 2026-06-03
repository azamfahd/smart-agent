
import React, { memo } from 'react';
import { AGENTS, THEME } from '../constants';
import { AgentRole, ChatSession } from '../types';

interface SidebarProps {
  activeSessionId: string | null;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  activeProviderName: string;
  isOpen: boolean;
  onClose: () => void;
  activeAgentId: AgentRole;
  onSelectAgent: (id: AgentRole) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeSessionId, 
  sessions, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession, 
  onOpenSettings, 
  activeProviderName, 
  isOpen, 
  onClose,
  activeAgentId,
  onSelectAgent
}) => {
  // Fix: Ensure all colors used in AGENTS are mapped here to avoid undefined errors
  const colorMap: Record<string, { bg: string, text: string, border: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }, // Fallback for previous colors
  };

  const getAgentStyles = (color: string) => colorMap[color] || colorMap.indigo;

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed lg:static inset-y-0 right-0 z-[90] w-80 transform transition-transform duration-500 ease-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${THEME.glass} border-l flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <i className="fas fa-robot text-lg"></i>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">الوكيل برو</h2>
          </div>
          <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Agent Selection Section */}
        <div className="p-4 border-b border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">اختر تخصص الوكيل</p>
          <div className="grid grid-cols-5 gap-2">
            {AGENTS.map((agent) => {
              const styles = getAgentStyles(agent.color);
              const isActive = activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent.id)}
                  title={agent.name}
                  className={`relative aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                    ? `${styles.bg} ${styles.text} border-2 ${styles.border} scale-110 shadow-lg` 
                    : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  <i className={`fas ${agent.icon} text-lg`}></i>
                  {isActive && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#020617] animate-pulse"></div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          <button 
            onClick={onNewChat}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group overflow-hidden relative"
          >
            <i className="fas fa-plus group-hover:rotate-90 transition-transform duration-300"></i>
            محادثة جديدة
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-3 mt-2">سجل المحادثات</p>
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const sessionAgent = AGENTS.find(a => a.id === session.agentId) || AGENTS[0];
              const isActive = activeSessionId === session.id;
              const styles = getAgentStyles(sessionAgent.color);
              
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 ${
                    isActive 
                    ? 'bg-white/10 border border-white/10 shadow-lg' 
                    : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${styles.bg} ${styles.text} border ${styles.border}`}>
                    <i className={`fas ${sessionAgent.icon} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : ''}`}>{session.title || 'محادثة فارغة'}</p>
                    <p className="text-[10px] opacity-40 mt-0.5">{new Date(session.updatedAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <button 
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                  >
                    <i className="fas fa-trash-alt text-[10px]"></i>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-600">
              <i className="fas fa-comment-slash text-3xl mb-3 opacity-20"></i>
              <p className="text-xs font-bold opacity-40">لا توجد محادثات سابقة</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
          <div className="bg-indigo-600/5 border border-white/5 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">المزود النشط</span>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <p className="text-sm font-black text-white flex items-center gap-2">
              <i className="fas fa-microchip text-indigo-400"></i> {activeProviderName}
            </p>
          </div>

          <button 
            onClick={onOpenSettings}
            className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#020617] flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                <i className="fas fa-cog"></i>
              </div>
              <span className="text-sm font-bold">الإعدادات</span>
            </div>
            <i className="fas fa-chevron-left text-[10px] opacity-40 group-hover:-translate-x-1 transition-transform"></i>
          </button>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
