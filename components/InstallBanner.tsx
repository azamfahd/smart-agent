
import React from 'react';

interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ onInstall, onDismiss }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-bottom-8 duration-700">
      <div className="glass-morphism p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <i className="fas fa-brain text-white text-2xl"></i>
        </div>
        <div className="flex-1">
          <h4 className="font-black text-sm text-white">ثبّت التطبيق الآن</h4>
          <p className="text-[10px] text-slate-400 font-medium leading-tight">استمتع بتجربة أسرع وكاملة مباشرة من شاشتك الرئيسية.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onInstall}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            تثبيت
          </button>
          <button 
            onClick={onDismiss}
            className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
