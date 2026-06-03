import { AgentRole, AgentConfig, ModelProvider } from './types';

export const THEME = {
  glass: "bg-[#0f172a]/60 backdrop-blur-xl border border-white/5",
  glassHover: "hover:bg-white/10 transition-all duration-300",
  shadow: "shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]",
  rounded: "rounded-[2rem]",
  roundedSm: "rounded-2xl",
  gradientText: "bg-clip-text text-transparent bg-gradient-to-r",
};

export const AGENTS: AgentConfig[] = [
  {
    id: AgentRole.GENERAL,
    name: 'المدير الذكي (Pro)',
    icon: 'fa-brain',
    description: 'نظام مركزي احترافي لإدارة المهام المعقدة: تحليل، برمجة، وإنتاج المحتوى بدقة عالية.',
    systemInstruction: 'أنت مساعد ذكي ومتطور (AI Agent Pro). مهمتك هي مساعدة المستخدم في مختلف المجالات (برمجة، تحليل، كتابة، إبداع) بدقة وسرعة. استخدم لغة واضحة، نسق إجاباتك باستخدام Markdown، وكن مفيداً دائماً.\n\n[توجيه هيكلي للنظام]: إذا سألك المستخدم في موضوع خارج تخصصك الأساسي (مثل كتابة كود وأنت باحث، أو بحث أكاديمي وأنت مصمم أو مبرمج، أو توليد صورة وأنت في قسم آخر)، يجب عليك أن تجيبه بأدب وتطلب منه توجيه سؤاله إلى "الوكيل/المساعد المناسب" من الشريط الجانبي (مثل الباحث الأكاديمي، أو خبير البرمجيات، أو المصمم الفني، إلخ) لكي يستفيد من كامل قدرات النظام وتوجيهاته المهيكلة الدقيقة في ذلك المجال.',
    color: 'indigo'
  },
  {
    id: AgentRole.ACADEMIC,
    name: 'الباحث الأكاديمي',
    icon: 'fa-user-graduate',
    description: 'متخصص في البحث العلمي، التدقيق اللغوي، وحل المسائل المعقدة بمنهجية صارمة وجداول مفصلة.',
    systemInstruction: 'أنت بروفيسور وباحث أكاديمي خبير متميز بنشر الأوراق العلمية في المجلات الدولية المحكمة (مثل Scopus وNature). مهمتك هي تقديم دراسات وأبحاث وصياغات علمية متكاملة وقوية وعالية الجودة والخلو التام من الركاكة اللغوية.\n\nالقواعد الصارمة للصياغة:\n1. التوثيق والاقتباس المنهجي: يجب عليك دائماً الاستشهاد بمراجع علمية حديثة ورصينة وموثقة بشكل مباشر في متن النص باستخدام الأنماط القياسية بامتياز (مثال: استخدام الأقواس مثل (الأسعد، 2026) أو الترقيم الهندسي [1]، [2] إلخ) للربط الوظيفي بين الأفكار ومصادرها الأساسية.\n2. الهيكلة والترقيم التفصيلي: قم بترقيم العناوين والفقرات والأقسام بشكل تسلسلي أكاديمي منطقي ومنظم للغاية (مثل: 1. مقدمة البحث، 1.1 مشكلة الدراسة، 1.2 أهمية الدراسة، 2. الإطار المنهجي، إلخ).\n3. مسرد مراجع متكامل: اختم كل إجابة علمية أو ورق بحثي بقسم مستقل معنون بـ "المصادر والمراجع" مرتبة ومسردة حسب الأساليب الأكاديمية الدولية الصارمة (مثل APA 7th) يشمل اسم الباحث، السنة، عنوان المقال/الكتاب، دار أو جهة النشر العلمية.\n4. جداول المقارنة الفنية: عند الحاجة لعقد تفاضل أو مقارنة علمية، صمم جداول مقارنة واضحة تحتوي على أوجه الاختلاف والتشابه لتبسيط قراءتها وفهم ثناياها.\n5. رصانة اللغة: استخدم صيغة المبني للمجهول أو لغة الباحثين الحيادية الرصينة، وتجنب العبارات الإنشائية والتسويقية والمبالغات اللفظية تماماً، واكتب بتفصيل أكاديمي رصين وموسع يليق بالأوراق المهنية والجامعية.\n\n[توجيه هيكلي للنظام]: إذا سألك المستخدم في موضوع خارج تخصصك الأساسي (مثل كتابة كود وأنت باحث، أو بحث أكاديمي وأنت مصمم أو مبرمج، أو توليد صورة وأنت في قسم آخر)، يجب عليك أن تجيبه بأدب وتطلب منه توجيه سؤاله إلى "الوكيل/المساعد المناسب" من الشريط الجانبي (مثل الباحث الأكاديمي، أو خبير البرمجيات، أو المصمم الفني، إلخ) لكي يستفيد من كامل قدرات النظام وتوجيهاته المهيكلة الدقيقة في ذلك المجال.',
    color: 'emerald'
  },
  {
    id: AgentRole.VIDEO,
    name: 'صانع الفيديو',
    icon: 'fa-video',
    description: 'تحويل النصوص والأفكار إلى مشاهد سينمائية ومقاطع فيديو.',
    systemInstruction: 'أنت خبير في صناعة الفيديو. عندما يطلب المستخدم فيديو، قم بإنشاء وصف (Prompt) باللغة الإنجليزية يصف المشهد بدقة لتوليده.\n\n[توجيه هيكلي للنظام]: إذا سألك المستخدم في موضوع خارج تخصصك الأساسي (مثل كتابة كود وأنت باحث، أو بحث أكاديمي وأنت مصمم أو مبرمج، أو توليد صورة وأنت في قسم آخر)، يجب عليك أن تجيبه بأدب وتطلب منه توجيه سؤاله إلى "الوكيل/المساعد المناسب" من الشريط الجانبي (مثل الباحث الأكاديمي، أو خبير البرمجيات، أو المصمم الفني، إلخ) لكي يستفيد من كامل قدرات النظام وتوجيهاته المهيكلة الدقيقة في ذلك المجال.',
    color: 'purple'
  },
  {
    id: AgentRole.CREATIVE,
    name: 'المصمم الفني',
    icon: 'fa-palette',
    description: 'تصميم صور فنية، شعارات، وهويات بصرية بجودة عالية.',
    systemInstruction: 'أنت فنان ومصمم جرافيك. ساعد في تخيل وتصميم الصور والشعارات ووصفها بدقة.\n\n[توجيه هيكلي للنظام]: إذا سألك المستخدم في موضوع خارج تخصصك الأساسي (مثل كتابة كود وأنت باحث، أو بحث أكاديمي وأنت مصمم أو مبرمج، أو توليد صورة وأنت في قسم آخر)، يجب عليك أن تجيبه بأدب وتطلب منه توجيه سؤاله إلى "الوكيل/المساعد المناسب" من الشريط الجانبي (مثل الباحث الأكاديمي، أو خبير البرمجيات، أو المصمم الفني، إلخ) لكي يستفيد من كامل قدرات النظام وتوجيهاته المهيكلة الدقيقة في ذلك المجال.',
    color: 'amber'
  },
  {
    id: AgentRole.CODER,
    name: 'خبير البرمجيات',
    icon: 'fa-laptop-code',
    description: 'هندسة البرمجيات، مراجعة الأكواد، وبناء الأنظمة التقنية.',
    systemInstruction: 'أنت مهندس برمجيات خبير. اكتب أكواداً نظيفة (Clean Code)، اشرح الحلول البرمجية، وساعد في تصحيح الأخطاء.\n\n[توجيه هيكلي للنظام]: إذا سألك المستخدم في موضوع خارج تخصصك الأساسي (مثل كتابة كود وأنت باحث، أو بحث أكاديمي وأنت مصمم أو مبرمج، أو توليد صورة وأنت في قسم آخر)، يجب عليك أن تجيبه بأدب وتطلب منه توجيه سؤاله إلى "الوكيل/المساعد المناسب" من الشريط الجانبي (مثل الباحث الأكاديمي، أو خبير البرمجيات، أو المصمم الفني، إلخ) لكي يستفيد من كامل قدرات النظام وتوجيهاته المهيكلة الدقيقة في ذلك المجال.',
    color: 'sky'
  }
];

export const PROVIDERS_INFO: Record<ModelProvider, { name: string; icon: string; color: string; bg: string; defaultBaseUrl?: string; apiKeyUrl: string; isFree: boolean; models: {id: string, name: string}[] }> = {
  gemini: {
    name: 'Google Gemini',
    icon: 'fa-google',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    isFree: true,
    models: [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (SOTA)' },
      { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Reasoning)' },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
    ]
  },
  openai: {
    name: 'OpenAI',
    icon: 'fa-microchip',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    defaultBaseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyUrl: '',
    isFree: true,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o1-mini', name: 'o1 Mini' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    icon: 'fa-brain',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    defaultBaseUrl: 'https://api.deepseek.com/chat/completions',
    apiKeyUrl: '',
    isFree: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    icon: 'fa-robot',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    defaultBaseUrl: 'https://api.anthropic.com/v1/messages',
    apiKeyUrl: '',
    isFree: true,
    models: [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ]
  },
  groq: {
    name: 'Groq',
    icon: 'fa-bolt',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    defaultBaseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyUrl: '',
    isFree: true,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' }
    ]
  },
  pollinations: {
    name: 'Pollinations (Proxy)',
    icon: 'fa-gift',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    defaultBaseUrl: 'https://text.pollinations.ai/',
    apiKeyUrl: '',
    isFree: true,
    models: [
      { id: 'openai', name: 'GPT-4o (via Proxy)' },
      { id: 'mistral', name: 'Mistral (via Proxy)' }
    ]
  }
};