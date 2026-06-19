
import React, { memo } from 'react';
import { AGENTS, THEME } from '../constants';
import { AgentRole, ChatSession } from '../types';

interface SidebarProps {
  activeSessionId: string | null;
  sessions: ChatSession[];
  onSelectSession: (id: string | null) => void;
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
  // Enhanced colorMap with dynamic glow values for a professional 3D neon-lighting feel
  const colorMap: Record<string, { bg: string, text: string, border: string, glow: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'neon-glow-indigo' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'neon-glow-emerald' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'neon-glow-purple' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'neon-glow-amber' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30', glow: 'neon-glow-sky' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'neon-glow-indigo' }, 
  };

  const getAgentStyles = (color: string) => colorMap[color] || colorMap.indigo;

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[80] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed lg:static inset-y-0 right-0 z-[90] w-80 transform transition-transform duration-500 ease-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'} bg-[#0a0f26]/85 backdrop-blur-2xl border-l border-white/5 flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]`}>
        {/* Sidebar Header with 3D Logo area */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div 
            onClick={() => { onSelectSession(null); onClose(); }}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 active:scale-95 transition-all select-none"
            title="العودة للواجهة الرئيسية"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 card-3d">
              <i className="fas fa-robot text-lg"></i>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex flex-col">
              <span>الوكيل برو</span>
              <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">AI AGENT PLATFORM</span>
            </h2>
          </div>
          <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Agent Selection Section with premium active glows */}
        <div className="p-4 border-b border-white/5 bg-[#0a0f26]/40">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">مساعدو الذكاء المتخصصون</p>
          <div className="grid grid-cols-5 gap-2">
            {AGENTS.map((agent) => {
              const styles = getAgentStyles(agent.color);
              const isActive = activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent.id)}
                  title={agent.name}
                  className={`relative aspect-square rounded-xl flex items-center justify-center transition-all duration-300 card-3d ${
                    isActive 
                    ? `${styles.bg} ${styles.text} border-2 ${styles.border} ${styles.glow} scale-110 shadow-lg` 
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  <i className={`fas ${agent.icon} text-lg`}></i>
                  {isActive && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0a0f26] animate-pulse"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* New Chat Button: Ultimate 3D Glow Design */}
        <div className="p-4">
          <button 
            onClick={onNewChat}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] border border-indigo-400/20 transition-all active:scale-95 group overflow-hidden relative glowing-btn-wrap"
          >
            <i className="fas fa-plus text-xs group-hover:rotate-90 transition-transform duration-300"></i>
            <span className="text-sm">محادثة جديدة</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>

        {/* Sessions List - Deep Glass visualizer */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-3 mt-2">سجل المحادثات الذكي</p>
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const sessionAgent = AGENTS.find(a => a.id === session.agentId) || AGENTS[0];
              const isActive = activeSessionId === session.id;
              const styles = getAgentStyles(sessionAgent.color);
              
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 border card-3d ${
                    isActive 
                    ? `bg-white/10 ${styles.border} ${styles.glow} shadow-lg shadow-black/30` 
                    : 'hover:bg-white/5 text-slate-300 hover:text-white border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styles.bg} ${styles.text} border ${styles.border}`}>
                    <i className={`fas ${sessionAgent.icon} text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{session.title || 'محادثة فارغة'}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{new Date(session.updatedAt).toLocaleDateString('ar-SA')} - {sessionAgent.name}</p>
                  </div>
                  <button 
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-80 lg:opacity-0 lg:group-hover:opacity-100 w-7 h-7 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-rose-500/20"
                    title="حذف المحادثة"
                  >
                    <i className="fas fa-trash-alt text-[9px]"></i>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <i className="fas fa-comment-slash text-3xl mb-3 opacity-20"></i>
              <p className="text-xs font-black opacity-40">لا توجد محادثات سابقة</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer with Active Provider Info Card */}
        <div className="p-4 mt-auto border-t border-white/5 bg-[#070b1c]/90">
          <div className="bg-[#0e1634] border border-white/5 rounded-2xl p-4 mb-3 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المزود النشط</span>
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">PRO ACTIVE</span>
            </div>
            <p className="text-xs font-black text-slate-100 flex items-center gap-2">
              <i className="fas fa-network-wired text-amber-500"></i> {activeProviderName}
            </p>
          </div>

          <button 
            onClick={onOpenSettings}
            className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-between group border border-white/5 hover:border-white/10 shadow-md card-3d"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
                <i className="fas fa-cog"></i>
              </div>
              <span className="text-xs font-black">إعدادات المنصة</span>
            </div>
            <i className="fas fa-chevron-left text-[10px] opacity-40 group-hover:-translate-x-1 transition-transform"></i>
          </button>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
