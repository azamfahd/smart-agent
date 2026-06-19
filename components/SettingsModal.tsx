
import React, { useState, useEffect } from 'react';
import { AppSettings, ModelProvider } from '../types';
import { PROVIDERS_INFO } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<ModelProvider | 'general'>('general');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleProviderChange = (provider: ModelProvider, field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [provider]: {
          ...prev.providers[provider],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
      onClose();
    }, 800);
  };

  const openSelectKeyDialog = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-[#030712]/80 backdrop-blur-md animate-in fade-in duration-200 p-0 md:p-4">
      <div className="bg-[#0b0f24] border-t md:border border-white/10 w-full max-w-5xl h-[92vh] md:h-[85vh] rounded-t-[2rem] md:rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col md:flex-row overflow-hidden relative">
        
        <button 
          onClick={onClose}
          className="absolute top-5 left-5 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white hidden md:flex items-center justify-center transition-all border border-white/10"
        >
          <i className="fas fa-times"></i>
        </button>

        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white/[0.02] border-b md:border-b-0 md:border-l border-white/10 flex flex-col shrink-0">
           <div className="flex md:hidden items-center justify-between p-4 pb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fas fa-sliders text-amber-500"></i> الإعدادات
              </h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                <i className="fas fa-times"></i>
              </button>
           </div>

           <div className="p-4 hidden md:block mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fas fa-sliders-h text-amber-500"></i> الإعدادات
            </h2>
          </div>
          
          <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto custom-scrollbar p-2 md:p-4 gap-2 md:gap-1 scroll-smooth">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex-shrink-0 md:flex-shrink flex items-center gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-xl transition-all font-medium text-xs md:text-sm md:text-right whitespace-nowrap ${activeTab === 'general' ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'text-slate-300 bg-transparent hover:bg-white/5'}`}
            >
              <i className="fas fa-layer-group md:w-5 md:text-center"></i> عام
            </button>
            
            <p className="hidden md:block px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">مزوّدو الخدمة</p>

            {(Object.keys(PROVIDERS_INFO) as ModelProvider[]).map((provider) => {
              const info = PROVIDERS_INFO[provider];
              const isEnabled = localSettings.providers[provider].enabled;
              return (
                <button
                  key={provider}
                  onClick={() => setActiveTab(provider)}
                  className={`flex-shrink-0 md:flex-shrink md:w-full flex items-center justify-between px-4 py-2 md:py-3 rounded-xl transition-all font-medium text-xs md:text-sm group whitespace-nowrap ${activeTab === provider ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-inner' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center ${activeTab === provider ? info.bg : 'bg-white/5'} ${info.color}`}>
                      <i className={`fas ${info.icon} text-xs`}></i>
                    </div>
                    <span className="text-slate-200 group-hover:text-white transition-colors">{info.name}</span>
                  </div>
                  {isEnabled && <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#070b1c]/30 overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            {activeTab === 'general' ? (
              <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-left-4 duration-300 pb-4">
                <section>
                  <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <i className="fas fa-globe text-slate-400"></i> لغة التطبيق
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['ar', 'en'].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLocalSettings(prev => ({ ...prev, system: { ...prev.system, language: l as any } }))}
                        className={`py-4 px-6 rounded-2xl border font-bold text-sm transition-all flex items-center justify-center gap-2 ${localSettings.system.language === l ? 'bg-amber-500 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'}`}
                      >
                        {l === 'ar' ? 'العربية' : 'English'}
                        {localSettings.system.language === l && <i className="fas fa-check-circle text-white"></i>}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <i className="fas fa-bolt text-slate-400"></i> المحرك الافتراضي للردود
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(Object.keys(PROVIDERS_INFO) as ModelProvider[]).map((p) => {
                      const isActive = localSettings.activeProvider === p;
                      const info = PROVIDERS_INFO[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setLocalSettings(prev => ({ ...prev, activeProvider: p }))}
                          className={`p-4 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden ${isActive ? 'bg-amber-500/10 border-amber-500/35 text-amber-300' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[#131b3e] ${info.color}`}>
                             <i className={`fas ${info.icon}`}></i>
                          </div>
                          <div className="text-right">
                             <div className="font-bold text-xs text-slate-200">{info.name}</div>
                             <div className="flex gap-1 mt-0.5">
                               {isActive && <div className="text-[10px] text-amber-400 opacity-90 font-bold">نشط</div>}
                               {info.isFree && <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded border border-emerald-500/10">مجاني</div>}
                             </div>
                          </div>
                          {isActive && <div className="absolute top-2 left-2 text-amber-500"><i className="fas fa-check-circle"></i></div>}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 p-6 rounded-3xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <i className="fas fa-laptop-house text-indigo-400"></i> دليل التثبيت والتشغيل أوفلاين (بلا إنترنت)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    هذا التطبيق مهيأ بالكامل للعمل بوضع <strong>Offline</strong> بدون الاتصال بالإنترنت بشكل آمن وتلقائي عبر تقنية PWA (Progressive Web App). يتم حفظ جميع محادثاتك وأبحاثك وسجلاتك محلياً وبتشفير آمن على جهازك.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                    <div className="bg-white/[0.04] p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fab fa-chrome text-amber-400 text-xs"></i>
                        <h4 className="text-xs font-bold text-slate-150">أجهزة أندرويد والحاسوب (Chrome & Edge)</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        انقر على زر <strong>"بدء تثبيت التطبيق"</strong> بالأسفل، أو اضغط على النقاط الثلاث بجوار شريط العنوان ثم اختر <strong>"تثبيت التطبيق" (Install App)</strong>.
                      </p>
                    </div>
                    <div className="bg-white/[0.04] p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fab fa-safari text-indigo-400 text-xs"></i>
                        <h4 className="text-xs font-bold text-slate-150">أجهزة آيفون وآيباد (Safari)</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        اضغط على أيقونة <strong>"مشاركة" (Share)</strong> أسفل المتصفح، ثم مرر لأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <button 
                      type="button"
                      onClick={() => {
                        const event = (window as any).promptInstall;
                        if (event) {
                          event.prompt();
                        } else {
                          alert("تطبيقك مثبت بالفعل أو متصفحك لا يتطلب إذناً إضافياً للتثبيت حالياً. يمكنك استخدام طريقة الإضافة اليدوية المكتوبة أعلاه بنجاح!");
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white text-[11px] font-black rounded-lg transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 flex items-center gap-2 border border-indigo-550"
                    >
                      <i className="fas fa-download"></i>
                      <span>بدء تثبيت التطبيق الآن</span>
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-left-4 duration-300 pb-4">
                <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-md bg-[#131b3e] ${PROVIDERS_INFO[activeTab].color}`}>
                      <i className={`fas ${PROVIDERS_INFO[activeTab].icon}`}></i>
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white">{PROVIDERS_INFO[activeTab].name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] md:text-xs text-slate-400 font-medium">تكوين الاتصال والنموذج</p>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">مجاني ومدمج بالكامل</span>
                      </div>
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer bg-white/5 px-4 py-2 rounded-full border border-white/10 transition-colors">
                    <span className={`text-xs font-bold ${localSettings.providers[activeTab].enabled ? 'text-white' : 'text-slate-400'}`}>
                      {localSettings.providers[activeTab].enabled ? 'مفعل' : 'معطل'}
                    </span>
                    <div className="relative">
                      <input 
                        type="checkbox"
                        checked={localSettings.providers[activeTab].enabled}
                        onChange={(e) => handleProviderChange(activeTab, 'enabled', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-all ${localSettings.providers[activeTab].enabled ? 'bg-emerald-550' : 'bg-white/10'}`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${localSettings.providers[activeTab].enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>

                <div className={`space-y-8 transition-opacity duration-300 ${localSettings.providers[activeTab].enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  
                  {activeTab === 'gemini' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 text-xl shadow-inner border border-white/5">
                            <i className="fas fa-check-circle"></i>
                         </div>
                         <div>
                            <h4 className="text-white font-bold text-sm">الاتصال مدمج ونشط تلقائياً</h4>
                            <p className="text-slate-300 text-xs mt-1">يأتي نموذج Gemini مفعلاً بشكل كامل ومجاني دون الحاجة لتوفير أي مفتاح API من قبلك.</p>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab !== 'gemini' && activeTab !== 'pollinations' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
                       <i className="fas fa-check-circle text-emerald-400"></i>
                       <p className="text-[10px] text-emerald-300 font-medium">تم تفعيل الاتصال المجاني والمباشر لهذا النموذج تلقائياً وبدون أي حدود.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">النموذج (Model)</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PROVIDERS_INFO[activeTab].models.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleProviderChange(activeTab, 'selectedModel', m.id)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            localSettings.providers[activeTab].selectedModel === m.id 
                            ? 'bg-amber-500 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]' 
                            : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                         <i className="fas fa-cube"></i>
                      </div>
                      <input 
                        type="text"
                        value={localSettings.providers[activeTab].selectedModel}
                        onChange={(e) => handleProviderChange(activeTab, 'selectedModel', e.target.value)}
                        placeholder="أو اكتب معرف النموذج يدوياً"
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-sm text-white focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Personal API Key Field */}
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div>
                      <label className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                          <span>مفتاح الـ API الخاص بـ {PROVIDERS_INFO[activeTab].name}</span>
                          {PROVIDERS_INFO[activeTab].apiKeyUrl && (
                            <a href={PROVIDERS_INFO[activeTab].apiKeyUrl} target="_blank" rel="noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1 text-[10px]">
                              <i className="fas fa-external-link-alt text-[9px]"></i> احصل على المفتاح من هنا
                            </a>
                          )}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                          <i className="fas fa-key"></i>
                        </div>
                        <input
                          type="password"
                          value={localSettings.providers[activeTab].userApiKey || ''}
                          onChange={(e) => handleProviderChange(activeTab, 'userApiKey', e.target.value)}
                          placeholder="أدخل مفتاح API الخاص بك هنا (مثل مفاتيح Gemini أو DeepSeek أو Groq)"
                          className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
                          إذا قمت بإدخال مفتاح خاص بك، فسيتم استخدامه بدلاً من المفتاح الأساسي للتطبيق. يضمن هذا استمرار العمل بدون قيود حتى في حالات الضغط العالي.
                      </p>
                    </div>

                    {/* Custom Proxy / Base URL Field */}
                    <div>
                      <label className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                        <span>العنوان البرمجي المخصص / بروكسي (Base URL / Proxy)</span>
                        <span className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 transition-all" onClick={() => {
                          const helpDiv = document.getElementById('proxy-guide-help');
                          if (helpDiv) helpDiv.classList.toggle('hidden');
                        }}>
                          <i className="fas fa-question-circle"></i> كيف يعمل البروكسي؟
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                          <i className="fas fa-link"></i>
                        </div>
                        <input
                          type="text"
                          value={localSettings.providers[activeTab].baseUrl || ''}
                          onChange={(e) => handleProviderChange(activeTab, 'baseUrl', e.target.value)}
                          placeholder={PROVIDERS_INFO[activeTab].defaultBaseUrl || "العنوان الافتراضي للنموذج (اختياري)"}
                          className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-sm text-white focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
                        اختياري: لتوجيه الطلبات عبر خوادم بروكسي مخصصة (Proxy Gateway) أو خدمات مثل OpenRouter أو Cloudflare. دعها فارغة لاستخدام العنوان الافتراضي الرسمي.
                      </p>

                      {/* Interactive Arabic Step-by-Step Proxy Guide */}
                      <div id="proxy-guide-help" className="hidden mt-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-slate-300 space-y-3 leading-relaxed">
                        <div className="font-bold text-indigo-300 flex items-center gap-1.5 border-b border-indigo-500/20 pb-2">
                          <i className="fas fa-info-circle"></i>
                          <span>دليل إعداد بروكسي مخصص وسحب المفتاح</span>
                        </div>
                        
                        <div className="space-y-3 font-sans">
                          <div>
                            <span className="font-bold text-amber-400 block mb-1">💡 ما هو البروكسي (Proxy/Base URL)؟</span>
                            <span className="text-slate-400 text-[11px]">هو خادم وسيط يمر عبره كود الاتصال. يتيح لك ربط أي نموذج بمصادر مخصصة أو بوابات مثل <b className="text-white">OpenRouter</b> لتشغيل كافة موديلات الذكاء الاصطناعي بمفتاح واحد ورابط موحد، أو لوضع بوابتك الأمنية الخاصة.</span>
                          </div>

                          <div className="border-t border-indigo-500/10 pt-2">
                            <span className="font-bold text-emerald-400 block mb-1">🛠️ خطوات ربط OpenRouter (موصى به للغاية):</span>
                            <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300">
                              <li>
                                اذهب إلى <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-amber-500 underline font-bold hover:text-amber-400 inline-flex items-center gap-1">
                                  صفحة مفاتيح OpenRouter <i className="fas fa-external-link-alt text-[9px]"></i>
                                </a> وقم بإنشاء مفتاح جديد (Create Key) وانسخه.
                              </li>
                              <li>
                                الصق الرابط التالي في خانة <b>العنوان البرمجي المخصص (Base URL)</b> بالأسفل:
                                <code className="block bg-black/40 text-rose-300 p-1.5 rounded mt-1 text-center font-mono select-all text-[10px]">https://openrouter.ai/api/v1</code>
                              </li>
                              <li>
                                الصق مفتاح OpenRouter الذي نسخته في خانة <b>مفتاح الـ API</b> بالأعلى.
                              </li>
                              <li>
                                اختر النموذج والاسم، واضغط <b>حفظ التغييرات</b> لتبدأ العمل مباشرة بكل سهولة!
                              </li>
                            </ol>
                          </div>

                          <div className="border-t border-indigo-500/10 pt-2">
                            <span className="font-bold text-blue-400 block mb-1">🌐 بوابات أخرى متوافقة:</span>
                            <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-400">
                              <li><b className="text-slate-300">Cloudflare AI Gateway:</b> توفر حماية وجودة اتصال فائقة وحماية مفاتيحك. يمكنك تفعيلها عبر <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">لوحة تحكم Cloudflare</a>.</li>
                              <li><b className="text-slate-300">خوادم مخصصة (Custom Reverse Proxy):</b> أي خادم مخصص يدعم بروتوكول اتصال OpenAI.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sliders Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    {/* Temperature Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">مستوى الإبداع والعمق (Creativity)</label>
                        <span className="text-xs font-mono text-amber-400 font-bold">{localSettings.providers[activeTab].temperature ?? 0.7}</span>
                      </div>
                      <input 
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.05"
                        value={localSettings.providers[activeTab].temperature ?? 0.7}
                        onChange={(e) => handleProviderChange(activeTab, 'temperature', parseFloat(e.target.value))}
                        className="w-full accent-amber-500 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 px-1">
                        <span>واقعي ودقيق</span>
                        <span>متوازن</span>
                        <span>إبداعي ومبتكر</span>
                      </div>
                    </div>

                    {/* Max Tokens Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">الحد الأقصى للإجابة (Max Tokens)</label>
                        <span className="text-xs font-mono text-emerald-450 font-bold">{localSettings.providers[activeTab].maxTokens ?? 4000}</span>
                      </div>
                      <input 
                        type="range"
                        min="1000"
                        max="8000"
                        step="250"
                        value={localSettings.providers[activeTab].maxTokens ?? 4000}
                        onChange={(e) => handleProviderChange(activeTab, 'maxTokens', parseInt(e.target.value))}
                        className="w-full accent-emerald-500 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 px-1">
                        <span>إجابة وجيزة</span>
                        <span>مفصلة وشاملة</span>
                        <span>بحث عميق ومطوّل</span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Enhancer Toggle */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="bg-white/[0.03] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#131b3e] flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                          <i className="fas fa-graduation-cap"></i>
                        </div>
                        <div>
                          <h5 className="text-white text-xs font-bold">محسّن الأبحاث الأكاديمية وصياغة النصوص</h5>
                          <p className="text-slate-450 text-[9px] mt-0.5 font-sans">يقوم بتنسيق المخرجات ودمج محركات الترجمة بدقة بالغة لإنتاج نصوص أبحاث احترافية.</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox"
                            checked={localSettings.providers[activeTab].apiKey === 'enhanced'}
                            onChange={(e) => handleProviderChange(activeTab, 'apiKey', e.target.checked ? 'enhanced' : '')}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-all ${localSettings.providers[activeTab].apiKey === 'enhanced' ? 'bg-amber-500' : 'bg-white/10'}`}></div>
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${localSettings.providers[activeTab].apiKey === 'enhanced' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/10 flex items-center justify-end gap-3 backdrop-blur-md shrink-0">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold text-xs transition-colors">إلغاء</button>
            <button onClick={handleSave} className={`px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-95 flex items-center gap-2 ${showSaved ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}>
              {showSaved ? <><i className="fas fa-check"></i> تم الحفظ</> : <><i className="fas fa-save"></i> حفظ التغييرات</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
