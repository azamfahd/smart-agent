import React, { useRef, useEffect, useState } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  isThinking: boolean;
  uploadedFiles: { data: string, mimeType: string }[];
  onFileDelete: (idx: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  input, setInput, onSend, isThinking, uploadedFiles, onFileDelete, onFileUpload 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSmartMenu, setShowSmartMenu] = useState(false);

  // Auto-grow textarea height smoothly based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const applySmartTool = (type: 'refine' | 'research' | 'table' | 'image' | 'video' | 'clear') => {
    if (type === 'clear') {
      setInput('');
      setShowSmartMenu(false);
      return;
    }

    let modifiedText = input;
    switch (type) {
      case 'refine':
        if (!input.trim()) {
          modifiedText = "قم بتحسين وصياغة النص التالي بأسلوب بليغ ومقنع وعلمي: ";
        } else {
          modifiedText = `${input.trim()}\n\n[يرجى تحسين صياغة هذا الطلب وجعله أكثر بلاغة وترتيب الإجابة في نقاط واضحة]`;
        }
        break;
      case 'research':
        modifiedText = `أريد كتابة هيكلية بحث أكاديمي متكامل حول موضوع: ____________\nيرجى تقسيم البحث إلى: المقدمة، الأهداف، المنهجية المتبعة، المراجعة الأدبية، والنتائج مع اقتراح مصادر عربية وأجنبية موثقة لـ PDF.`;
        break;
      case 'table':
        if (!input.trim()) {
          modifiedText = "صمم لي جدول مقارنة شامل ومفصل يقارن بين: ____________ و ____________ من حيث: المزايا، العيوب، والتكلفة.";
        } else {
          modifiedText = `قم بتحويل المعلومات السابقة إلى جدول مقارنة أكاديمي منظم بأعمدة واضحة ومقاييس تحليلية للمقارنة بينها: \n${input}`;
        }
        break;
      case 'image':
        modifiedText = `ارسم صورة فنية ومحاكاة بصرية فائقة الدقة لـ: ${input.trim()}`;
        break;
      case 'video':
        modifiedText = `أنشئ فيديو سينمائي تفاعلي ثلاثي الأبعاد يُظهر: ${input.trim()}`;
        break;
    }
    setInput(modifiedText);
    textareaRef.current?.focus();
    setShowSmartMenu(false);
  };

  // Close smart menu when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.smart-menu-container')) {
        setShowSmartMenu(false);
      }
    };
    if (showSmartMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSmartMenu]);

  return (
    <div className="p-4 md:p-6 bg-[#020617] border-t border-white/5 shrink-0 z-20 relative radial-glow-input">
      <div className="max-w-4xl mx-auto space-y-3 relative">
        
        {/* FILE PREVIEW PANEL */}
        {uploadedFiles.length > 0 && (
          <div className="flex gap-3 mb-2 overflow-x-auto pb-2 custom-scrollbar animate-slideDown">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/40 group shrink-0 shadow-lg group">
                <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover" alt="upload" />
                <button 
                  onClick={() => onFileDelete(i)} 
                  className="absolute inset-0 bg-black/70 flex items-center justify-center text-red-400 group-hover:opacity-100 opacity-0 transition-opacity"
                  title="حذف الملف"
                >
                  <i className="fas fa-trash text-lg"></i>
                </button>
                <div className="absolute top-1 left-1 bg-black/60 rounded-full w-4 h-4 flex items-center justify-center text-[8px] text-white">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* THE MAIN PREMIUM GLASS INPUT BAR */}
        <div className="relative flex items-end gap-2 sm:gap-3 bg-gradient-to-b from-[#1e293b]/50 to-[#0f172a]/80 backdrop-blur-2xl border border-white/10 rounded-[1.8rem] p-2 sm:p-3 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-500/40 transition-all duration-300 shadow-2xl">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={onFileUpload} 
          />
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 h-[44px]">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-all flex items-center justify-center shrink-0 border border-transparent hover:border-white/5"
              title="إرفاق صورة للتحليل البصري"
            >
              <i className="fas fa-image text-lg"></i>
            </button>

            {/* Smart Tools Dropdown Toggle */}
            <div className="relative smart-menu-container">
              <button 
                onClick={() => setShowSmartMenu(!showSmartMenu)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all flex items-center justify-center shrink-0 border ${showSmartMenu ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-transparent text-slate-400 hover:bg-white/5 border-transparent hover:border-white/5'}`}
                title="الصياغة الذكية والنماذج"
              >
                <i className="fas fa-magic text-base sm:text-lg"></i>
              </button>

              {/* Dropdown Menu */}
              {showSmartMenu && (
                <div className="absolute bottom-[calc(100%+12px)] right-0 w-64 bg-[#0f172a] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-fadeIn">
                  <div className="p-3 bg-slate-900/50 border-b border-white/5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <i className="fas fa-bolt text-amber-400"></i> اقتراحات ذكية سريعة
                    </span>
                  </div>
                  <div className="p-2 flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => applySmartTool('refine')}
                      className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <i className="fas fa-signature text-sm"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">تحسين النص الأكاديمي</span>
                        <span className="text-[9px] text-slate-500">صياغة بليغة ومنسقة وتدقيق شامل</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applySmartTool('research')}
                      className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <i className="fas fa-book-reader text-sm"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">قالب بحث متكامل</span>
                        <span className="text-[9px] text-slate-500">إدراج هيكلية موثقة مع المراجع</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applySmartTool('table')}
                      className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <i className="fas fa-table text-sm"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">إدراج جدول مقارنة</span>
                        <span className="text-[9px] text-slate-500">مقارنة تقنية أو علمية مفصلة الأبعاد</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applySmartTool('image')}
                      className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <i className="fas fa-paint-brush text-sm"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">رسم توليدي عميق</span>
                        <span className="text-[9px] text-slate-500">تصميم بصري دقيق حسب الوصف</span>
                      </div>
                    </button>

                    <button
                      onClick={() => applySmartTool('video')}
                      className="flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <i className="fas fa-film text-sm"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">توليد مشهد فيديو</span>
                        <span className="text-[9px] text-slate-500">وصف سينمائي لمشهد متحرك ديناميكي</span>
                      </div>
                    </button>
                    
                    {input.length > 0 && (
                      <>
                        <div className="h-px w-full bg-white/5 my-1"></div>
                        <button
                          onClick={() => applySmartTool('clear')}
                          className="flex items-center gap-3 w-full text-right px-3 py-2 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-colors group"
                        >
                          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors text-[10px]">
                            <i className="fas fa-eraser"></i>
                          </div>
                          <span className="text-xs font-medium">مسح النص</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اسألني عن أي شيء هنا... (مثال: ارسم صقر فوق قمة جبل...)"
            className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 resize-none py-3.5 max-h-[180px] min-h-[44px] custom-scrollbar text-sm md:text-base leading-relaxed px-1 sm:px-2"
            dir="auto"
            rows={1}
          />
          
          {/* Action Row containing characters counter and send button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 h-[44px] pb-0.5">
            {input.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
                {input.length} حرفاً
              </span>
            )}
            
            <button 
              onClick={onSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isThinking}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                input.trim() || uploadedFiles.length > 0 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95' 
                : 'bg-white/5 text-slate-500 cursor-not-allowed'
              }`}
            >
              <i className={`fas ${isThinking ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
          </div>
        </div>
        


      </div>
    </div>
  );
};

export default ChatInput;