import React, { useState, useEffect, useRef } from 'react';
import { THEME } from '../constants';
import { AppSettings, AgentConfig } from '../types';
import { generateTextResponse } from '../services/geminiService';

interface ResearchDocument {
  title: string;
  subtitle: string;
  university: string;
  college: string;
  department: string;
  author: string;
  supervisor: string;
  academicYear: string;
  date: string;
  docNumber?: string;
  emblemSubtext?: string;
  
  // Sections
  abstract: string;
  introduction: string;
  methodology: string;
  results: string;
  conclusion: string;
  references: string;
  
  // Styling configs
  showCoverPage: boolean;
  showPageNumbers: boolean;
  themeStyle: 'classic' | 'navy' | 'gold' | 'minimal' | 'emerald' | 'royal-red' | 'purple' | 'cyan';
  fontSize: 'sm' | 'base' | 'lg';
  margins: 'compact' | 'normal' | 'wide';
  lineHeight: 'normal' | 'relaxed' | 'double';
  
  // Advanced features
  showWatermark?: boolean;
  watermarkText?: string;
  showStamp?: boolean;
  emblemStyle?: 'none' | 'ksa' | 'academic' | 'tech' | 'shield';
  customFooterText?: string;
  showTableOfContents?: boolean;
}

interface ResearchWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  initialText?: string; // Optional text imported from chat message
  activeAgent?: AgentConfig;
}

const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({ isOpen, onClose, settings, initialText, activeAgent }) => {
  const [doc, setDoc] = useState<ResearchDocument>({
    title: 'عنوان البحث العلمي المقترح',
    subtitle: 'دراسة تحليلية متكاملة حول استخدام نماذج الذكاء الاصطناعي الكبيرة',
    university: 'جامعة الملك سعود',
    college: 'كلية علوم الحاسب والمعلومات',
    department: 'قسم تقنية المعلومات',
    author: 'أحمد بن عبد الله الأسعد',
    supervisor: 'الأستاذ الدكتور فهد السالم',
    academicYear: '1447هـ / 2026م',
    date: '2026-06-03',
    docNumber: 'AC-2026/8B',
    emblemSubtext: 'معايير النظم الموثقة',
    
    abstract: 'تهدف هذه الدراسة إلى استكشاف مدى فعالية وتأثير استخدام عملاء الذكاء الاصطناعي المتعددة (Multi-Agent Systems) في تسريع عمليات البحث والتطوير الأكاديمي. تتناول الدراسة تحليل الأطر النظرية وتطبيقاً عملياً في تحسين جودة صياغة الأوراق العلمية واستخراج المعرفة وتنسيق الملفات النهائية.',
    introduction: 'شهد العالم في الآونة الأخيرة طفرة تقنية هائلة في مجال الذكاء الاصطناعي التوليدي، وتحديداً النماذج اللغوية الكبيرة (LLMs). لقد تحولت هذه الأدوات من مجرد مجيبات تلقائية بسيطة إلى عملاء أذكياء قادرين على التفكير المنهجي والحلول التفاعلية الأكاديمية.\n\nتكمن المشكلة الدراسية في الفجوة الحالية بين حجم البيانات العلمية المنتجة وصعوبة تحليلها وتنظيمها وتصديرها كتقارير رصينة ومطابقة للمواصفات الأكاديمية القياسية. يسعى هذا البحث لتقديم حل تقني متكامل ومحور أساسي لتسهيل البحث العلمي.',
    methodology: 'اعتمدت الدراسة المنهج التحليلي الاستقرائي من خلال بناء نموذج أولي تفاعلي للعميل الذكي المتكامل. تم قياس رضا عينة من 100 باحث وأكاديمي بناءً على دقة المخرجات وسرعة الصياغة والتصدير.\n\nتضمنت الإجراءات:\n1. تحليل متطلبات الأبحاث العربية وصياغتها.\n2. تصميم وبناء نظام عملاء متكامل يعتمد على Gemini لتقديم اقتراحات علمية معززة بالمصادر.\n3. قياس وتقييم المخرجات.',
    results: 'أظهرت النتائج أن استخدام العملاء الأذكياء يساهم في خفض الوقت والجهد المبذول في صياغة الأبحاث والمسودات بنسبة تصل إلى 68%. كما سجلت دقة المخرجات اللغوية والتصنيف جودة عالية بنسبة 91% مقارنة بالصياغات اليدوية البسيطة، مع قدرة فائقة على تفادي الأخطاء الإملائية والتركيبية الشائعة.',
    conclusion: 'تخلص الدراسة إلى أن دمج تقنيات الذكاء الاصطناعي المتقدمة في البيئة الأكاديمية لم يعد ترفاً بل حاجة ملحة لرفع كفاءة النتاج العلمي والبحثي.\n\nوتوصي الدراسة بما يلي:\n- تبني المنصات الذكية الموحدة لتدريب الباحثين الجدد.\n- دعم أنظمة التصدير الاحترافي للمستندات العلمية والملفات التفاعلية لضمان الحفاظ على الهوية الأكاديمية.\n- استكمال الأبحاث حول نماذج الأمان والخصوصية في الاستخدام الأكائيمي.\n\nالرجاء إبداء الملاحظات أو إرسال فصول إضافية لمنصة الأبحاث لمزيد من التطوير والتدقيق المستمر.',
    references: '1. الأسعد، أحمد (2025). الأنظمة اللغوية الكبيرة في صياغة المحتوى العربي، المجلة العربية للبحث العلمي، المجلد 12، العدد 3.\n2. السالم، فهد (2026). الذكاء الاصطناعي التفاعلي ومستقبل التعليم العالي، دار النشر الأكاديمي، الرياض.\n3. بن غازي، خالد (2024). تطبيقات الـ Agents المتعددة في هندسة البرمجيات المعرفية، المؤتمر الدولي للذكاء الاصطناعي العربي.',
    
    showCoverPage: true,
    showPageNumbers: true,
    themeStyle: 'classic',
    fontSize: 'base',
    margins: 'normal',
    lineHeight: 'relaxed',
    showWatermark: false,
    watermarkText: 'وثيقة أكاديمية رسمية',
    showStamp: true,
    emblemStyle: 'ksa',
    customFooterText: 'تم التوثيق والتدقيق الأكاديمي بواسطة نظام العلوم الذكي المتكامل',
    showTableOfContents: true
  });

  const [activeTab, setActiveTab] = useState<'cover' | 'abstract' | 'content' | 'references' | 'styling'>('cover');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTargetField, setAiTargetField] = useState<keyof ResearchDocument | null>(null);

  // Advanced Academic Citation Builder States
  const [citationStyle, setCitationStyle] = useState<'apa' | 'ieee' | 'harvard' | 'chicago' | 'mla'>('apa');
  const [sourceType, setSourceType] = useState<'book' | 'journal' | 'web' | 'conference'>('book');
  const [citationAuthor, setCitationAuthor] = useState('');
  const [citationTitle, setCitationTitle] = useState('');
  const [citationYear, setCitationYear] = useState('2026');
  const [citationPublisher, setCitationPublisher] = useState('');
  const [citationVolumePage, setCitationVolumePage] = useState('');
  const [inTextCitation, setInTextCitation] = useState('');

  const handleInsertCitation = () => {
    if (!citationAuthor.trim() || !citationTitle.trim()) {
      alert('الرجاء كتابة اسم المؤلف وعنوان المصدر لتوليد المراجع بشكل احترافي.');
      return;
    }

    let formattedCitation = '';
    let inTextStr = '';

    // Extract first author name for in-text citation display
    const firstAuthor = citationAuthor.split('،')[0].split(',')[0].trim();

    if (citationStyle === 'apa') {
      // APA 7: Author, A. A. (Year). Title. Publisher.
      formattedCitation = `${citationAuthor} (${citationYear}). ${citationTitle}. ${citationPublisher ? citationPublisher + '.' : ''} ${citationVolumePage ? citationVolumePage + '.' : ''}`;
      inTextStr = `(${firstAuthor}، ${citationYear})`;
    } else if (citationStyle === 'ieee') {
      // IEEE: [No.] A. A. Author, "Title," Journal, vol. x, no. x, pp. xxx, Year.
      const refCount = (doc.references.match(/^\d+\./gm) || []).length + 1;
      formattedCitation = `${citationAuthor}، "${citationTitle}"، ${citationPublisher ? citationPublisher : ''}، ${citationVolumePage ? 'المجلد ' + citationVolumePage : ''}، ${citationYear}.`;
      inTextStr = `[${refCount}]`;
    } else if (citationStyle === 'harvard') {
      // Harvard: Author, A.A., Year. Title. Publisher.
      formattedCitation = `${citationAuthor}، ${citationYear}. ${citationTitle}. ${citationPublisher ? citationPublisher : ''}. ${citationVolumePage ? citationVolumePage : ''}`;
      inTextStr = `(${firstAuthor}, ${citationYear})`;
    } else if (citationStyle === 'chicago') {
      // Chicago: Author. Title. Publisher, Year.
      formattedCitation = `${citationAuthor}. ${citationTitle}. ${citationPublisher ? citationPublisher : ''}، ${citationYear}. ${citationVolumePage ? citationVolumePage : ''}`;
      inTextStr = `(${firstAuthor} ${citationYear})`;
    } else {
      // MLA 9: Author. Title. Publisher, Year.
      formattedCitation = `${citationAuthor}. ${citationTitle}. ${citationPublisher ? citationPublisher + '، ' : ''}${citationYear}. ${citationVolumePage ? citationVolumePage : ''}`;
      inTextStr = `(${firstAuthor} ${citationYear})`;
    }

    // Append citation
    setDoc(prev => {
      const currentRefs = prev.references ? prev.references.trim() : '';
      const separator = currentRefs ? '\n' : '';
      
      const referenceIndex = (currentRefs ? currentRefs.split('\n').length + 1 : 1);
      const nextRef = `${referenceIndex}. ${formattedCitation}`;

      return {
        ...prev,
        references: currentRefs + separator + nextRef
      };
    });

    setInTextCitation(inTextStr);
    
    // Reset inputs except year
    setCitationAuthor('');
    setCitationTitle('');
    setCitationPublisher('');
    setCitationVolumePage('');
  };
  
  const previewRef = useRef<HTMLDivElement>(null);

  // Import text from initial text if passed (when user clicks send to research editor)
  useEffect(() => {
    if (initialText) {
      // Parse academic metadata fields from the text
      const parsedMetadata: Partial<ResearchDocument> = {};
      
      const lines = initialText.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        // Parse color request
        if (/لون|ألوان|باللون|تنسيق/i.test(line)) {
          const colorMap: Record<string, string> = {
            'برتقالي': 'gold',
            'احمر': 'royal-red',
            'أحمر': 'royal-red',
            'ازرق': 'navy',
            'أزرق': 'navy',
            'كحلي': 'navy',
            'اخضر': 'emerald',
            'أخضر': 'emerald',
            'زمردي': 'emerald',
            'اصفر': 'gold',
            'أصفر': 'gold',
            'ذهبي': 'gold',
            'بنفسجي': 'purple',
            'زهري': 'purple',
            'وردي': 'purple',
            'رمادي': 'minimal',
            'اسود': 'minimal',
            'أسود': 'minimal',
            'حديث': 'modern',
            'بسيط': 'minimal',
            'كلاسيكي': 'classic',
            'أنيق': 'elegant'
          };
          for (const [ar, en] of Object.entries(colorMap)) {
            if (line.includes(ar)) {
              parsedMetadata.themeStyle = en as any;
              break;
            }
          }
        }
        
        // Parse university
        if (line.includes('جامعة')) {
          const idx = line.indexOf('جامعة');
          const cleanPart = line.substring(idx).split(/[،,؛\t\r]/)[0].trim();
          if (cleanPart.length > 5) {
            parsedMetadata.university = cleanPart;
          }
        }
        // Parse college
        if (line.includes('كلية')) {
          const idx = line.indexOf('كلية');
          const cleanPart = line.substring(idx).split(/[،,؛\t\r]/)[0].trim();
          if (cleanPart.length > 4) {
            parsedMetadata.college = cleanPart;
          }
        }
        // Parse department
        if (line.includes('قسم')) {
          const idx = line.indexOf('قسم');
          const cleanPart = line.substring(idx).split(/[،,؛\t\r]/)[0].trim();
          if (cleanPart.length > 3) {
            parsedMetadata.department = cleanPart;
          }
        }
        // Parse supervisor
        const supervisorKeywords = ['الدكتور', 'الأستاذ', 'أ.د', 'د.', 'إشراف', 'بإشراف', 'المشرف'];
        for (const kw of supervisorKeywords) {
          if (line.includes(kw + ' ') || line.includes(kw + '׃') || line.includes(kw + ':')) {
            const idx = line.indexOf(kw);
            const cleanPart = line.substring(idx).split(/[،,؛\n\t\r]/)[0].trim();
            if (cleanPart.length > kw.length + 2) {
              parsedMetadata.supervisor = cleanPart;
            }
            break;
          }
        }
        // Parse title
        const titleKeywords = ['عنوان البحث', 'موضوع البحث', 'بحث بعنوان', 'ورقة بعنوان'];
        for (const kw of titleKeywords) {
          if (line.includes(kw)) {
            const idx = line.indexOf(kw);
            const cleanPart = line.substring(idx + kw.length).replace(/[:׃]/g, '').trim();
            if (cleanPart.length > 4) {
              parsedMetadata.title = cleanPart;
            }
            break;
          }
        }
      }

      setDoc(prev => {
        const nextDoc = { ...prev };
        
        // Update document with parsed fields if detected
        if (parsedMetadata.university) nextDoc.university = parsedMetadata.university;
        if (parsedMetadata.college) nextDoc.college = parsedMetadata.college;
        if (parsedMetadata.department) nextDoc.department = parsedMetadata.department;
        if (parsedMetadata.supervisor) nextDoc.supervisor = parsedMetadata.supervisor;
        if (parsedMetadata.title) nextDoc.title = parsedMetadata.title;
        if (parsedMetadata.themeStyle) nextDoc.themeStyle = parsedMetadata.themeStyle;

        nextDoc.introduction = prev.introduction ? `${prev.introduction}\n\n${initialText}` : initialText;
        return nextDoc;
      });

      setActiveTab('content');
    }
  }, [initialText]);

  const handleUpdateField = (key: keyof ResearchDocument, value: any) => {
    setDoc(prev => ({ ...prev, [key]: value }));
  };

  const handleAiRefine = async () => {
    if (!aiTargetField || !aiPrompt.trim()) return;
    setIsGenerating(aiTargetField);
    setShowAiModal(false);
    
    try {
      const fieldNameAr = {
        title: 'العنوان الرئيسي',
        subtitle: 'العنوان الفرعي',
        abstract: 'الملخص الأكاديمي',
        introduction: 'المقدمة والتمهيد',
        methodology: 'المنهجية والإجراءات',
        results: 'النتائج والمناقشة',
        conclusion: 'الخاتمة والتوصيات',
        references: 'المصادر والمراجع'
      }[aiTargetField] || aiTargetField;

      const systemPrompt = `أنت باحث أكاديمي برتبة بروفيسور متميز. مهمتك هي كتابة أو تحسين وتطوير قسم "${fieldNameAr}" لبحث علمي أكاديمي باللغة العربية الفصحى الرصينة وبأعلى مستويات الجودة اللغوية والأكاديمية.\n\nقاعدة حاسمة وحتمية للتنسيق:\nيُمنع منعاً باتاً كتابة أو استخدام أي من رموز التنسيق الخام الخاصة بـ Markdown كعلامات التصنيف (##) أو دلالات التغميق (**) للمصطلحات، بل اعتمد كلياً على الترقيم والتبويب النصي الطبيعي الفخم، وصياغة العناوين باللغة الطبيعية دون علامات، واستخدم الترقيم الرقمي الجميل الواسع أو التقسيمات المرتبة للفقرات لتظهر كأفضل بحث وجامعي معتمد.`;
      
      const queryPrompt = `صغ لي قسمًا احترافيًا للبحث العلمي المنهجي التالي بالبيانات والتفاصيل المحددة أدناه:
- العنوان الأساسي للبحث: ${doc.title}
- العنوان الفرعي: ${doc.subtitle}
- الباحث/المؤلف: ${doc.author}
- المشرف الأكاديمي: ${doc.supervisor}
- الجامعة/المؤسسة: ${doc.university}
- الكلية والعمادة: ${doc.college}
- القسم الأكاديمي: ${doc.department}
- العام الأكاديمي: ${doc.academicYear}
- تاريخ النفاذ: ${doc.date}
${doc.docNumber ? `- رقم الوثيقة/التقرير: ${doc.docNumber}` : ''}

الطلب المباشر لتنسيق وصياغة هذا القسم: ${aiPrompt}

الرجاء تقديم النص الأكاديمي المقترح مباشرة دون أي مقدمات أو اعتذارات أو شرح خارجي. ابدأ بالنص فوراً بالأناقة والترقيم المطلوب.`;

      const response = await generateTextResponse(
        queryPrompt,
        'ACADEMIC' as any,
        systemPrompt,
        [],
        [],
        settings
      );

      if (response && response.text) {
        handleUpdateField(aiTargetField, response.text.trim());
      }
    } catch (error: any) {
      alert(`⚠️ حدث خطأ أثناء التوليد بالذكاء الاصطناعي: ${error.message}`);
    } finally {
      setIsGenerating(null);
      setAiPrompt('');
    }
  };

  const openAiHelper = (field: keyof ResearchDocument) => {
    setAiTargetField(field);
    const defaults = {
      title: 'اكتب موضوع بحثك ودع الذكاء الاصطناعي يصيغ عنواناً أكاديمياً جذاباً ومحكماً',
      subtitle: 'اكتب الفكرة الأساسية لبحثك ليقوم الذكاء الاصطناعي بصياغة عنوان فرعي شارح ومنهجي',
      abstract: 'اكتب الفكرة والمنهج والنتائج باختصار وسيقوم بتلخيصها في ملخص رصين ومكثف',
      introduction: 'اكتب الأهداف والدافع والمشكلة وسيقوم بصياغة مقدمة أكاديمية شاملة مع التمهيد',
      methodology: 'اكتب طريقة العمل وجمع البيانات وسيبني قسماً علمياً متكاملاً لوصف أدوات الدراسة ومنهجيتها',
      results: 'اكتب أهم الأرقام والملاحظات وسيقوم بصياغتها كقسم نتائج ومناقشة علمية مفصلة',
      conclusion: 'اكتب الخلاصة وأهدافك المستقبلية لصياغة خاتمة رصينة ومجموعة من التوصيات القابلة للتطبيق',
      references: 'اكتب أسماء المراجع غير المرتبة وسيرتبها لك طبقاً لأكثر الأساليب الأكاديمية دقة (مثل APA) باللغة العربية'
    };
    setAiPrompt(defaults[field as keyof typeof defaults] || '');
    setShowAiModal(true);
  };

  const renderAcademicMarkdown = (text: string, isAbstract: boolean = false) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    
    let listItems: React.ReactNode[] = [];
    let listType: 'bullet' | 'numeric' | null = null;
    let tableRows: React.ReactNode[][] = [];
    let tableHeaders: React.ReactNode[] = [];
    let insideTable = false;
    const renderedElements: React.ReactNode[] = [];

    const flushTable = (keyPrefix: string) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedElements.push(
          <div key={`table-wrapper-${keyPrefix}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm custom-scrollbar" >
            <table className="w-full text-xs md:text-sm text-right text-slate-800 border-collapse min-w-[600px]">
              {tableHeaders.length > 0 && (
                <thead className="text-[10px] md:text-xs uppercase font-bold text-slate-700 bg-slate-50 border-b border-slate-200">
                  <tr>
                    {tableHeaders.map((hdr, idx) => (
                      <th key={idx} className="px-3 md:px-5 py-2 md:py-3 border-l border-slate-200 last:border-0">{hdr}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b transition-colors border-slate-100 hover:bg-slate-50/70 last:border-0">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 md:px-5 py-2 md:py-3 leading-relaxed border-l border-slate-100 last:border-0 text-justify">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        tableHeaders = [];
        insideTable = false;
      }
    };


    const flushList = (keyPrefix: string) => {
      if (listItems.length > 0) {
        if (listType === 'bullet') {
          renderedElements.push(
            <ul key={`ul-${keyPrefix}`} className="list-disc list-inside space-y-2 my-2.5 pr-4 text-slate-700 text-justify leading-relaxed">
              {listItems}
            </ul>
          );
        } else {
          renderedElements.push(
            <ol key={`ol-${keyPrefix}`} className="list-decimal list-inside space-y-2.5 my-3.5 pr-4 text-slate-700 text-justify leading-relaxed">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        listType = null;
      }
    };

    const formatInline = (str: string) => {
      let html = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Replace bold markdown **text** with styled strong tag
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-[#0f172a] bg-slate-50 px-1 rounded">$1</strong>');
      
      // Replace italic *text* with styled em tag
      html = html.replace(/\*(.*?)\*/g, '<em class="italic text-[#1e293b] font-medium">$1</em>');

      // Replace inline code `code`
      html = html.replace(/`([^`]+)`/g, `<code class="px-1.5 py-0.5 rounded font-mono text-xs font-semibold ${themeStyles.codeAccent}">$1</code>`);

      // Citation highlight [1], [2]
      html = html.replace(/\[(\d+)\]/g, `<span class="inline-flex items-center justify-center border px-1.5 py-0.5 rounded text-[10px] font-bold font-mono mx-0.5 ${themeStyles.citeAccent}" title="توثيق $1">[$1]</span>`);
      
      // Citation highlight (الأسعد، 2026)
      html = html.replace(/(\([\u0600-\u06FF\w\s]+[،,]\s*\d{4}\))/g, `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${themeStyles.citeAccent}">$1</span>`);

      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      const uniqueKey = `acad-${lineIdx}`;

      // Check tables
      const tableMatch = trimmed.match(/^\|(.+)\|$/);
      if (tableMatch) {
        if (!trimmed) {
          flushList(uniqueKey);
          flushTable(uniqueKey);
          renderedElements.push(<div key={uniqueKey} className="h-2"></div>);
          return;
        }

        const rowContent = tableMatch[1];
        // match separators like |---|---|
        if (/^[\-\|\s:]+$/.test(rowContent)) {
           insideTable = true;
           return; 
        }
        const cells = rowContent.split('|').map(c => formatInline(c.trim()));
        
        if (!insideTable && tableHeaders.length === 0) {
           insideTable = true;
           tableHeaders = cells;
        } else {
           tableRows.push(cells);
        }
        return;
      } else {
        flushTable(uniqueKey);
      }


      // Check header
      if (trimmed.startsWith('#')) {
        flushList(uniqueKey);
        flushTable(uniqueKey);
        const level = (trimmed.match(/^#+/) || ['#'])[0].length;
        const titleText = trimmed.replace(/^#+\s*/, '');
        
        if (level === 1) {
          renderedElements.push(
            <h3 key={uniqueKey} className="text-base md:text-lg font-extrabold text-slate-800 mt-5 mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-1">
              <span className={`w-1.5 h-4 rounded-sm ${themeStyles.iconBg}`}></span>
              {formatInline(titleText)}
            </h3>
          );
        } else if (level === 2) {
          renderedElements.push(
            <h4 key={uniqueKey} className="text-sm md:text-base font-bold text-slate-705 mt-4 mb-2 flex items-center gap-1.5">
              <span className={`w-1 h-3 rounded-xs ${themeStyles.iconBg} opacity-80`}></span>
              {formatInline(titleText)}
            </h4>
          );
        } else {
          renderedElements.push(
            <h5 key={uniqueKey} className="text-xs md:text-sm font-bold text-slate-600 mt-3 mb-1 flex items-center gap-1">
              <i className={`fas fa-caret-left text-[10px] md:text-xs ${themeStyles.textAccent}`}></i>
              {formatInline(titleText)}
            </h5>
          );
        }
        return;
      }

      // Check lists
      const bulletMatch = line.match(/^(\s*)([\-\*\•])\s+(.*)/);
      if (bulletMatch) {
        if (listType !== 'bullet') {
          flushList(uniqueKey);
        flushTable(uniqueKey);
          listType = 'bullet';
        }
        listItems.push(
          <li key={`li-${uniqueKey}`} className="text-slate-700 leading-relaxed py-0.5 list-disc text-justify pr-1">
            {formatInline(bulletMatch[3])}
          </li>
        );
        return;
      }

      const numMatch = line.match(/^(\s*)(\d+|[\u0660-\u0669]+)[\.\-\)]\s+(.*)/);
      if (numMatch) {
        if (listType !== 'numeric') {
          flushList(uniqueKey);
        flushTable(uniqueKey);
          listType = 'numeric';
        }
        listItems.push(
          <li key={`li-${uniqueKey}`} className="text-slate-700 leading-relaxed py-0.5 list-decimal text-justify pr-1">
            {formatInline(numMatch[3])}
          </li>
        );
        return;
      }

      if (!trimmed) {
        flushList(uniqueKey);
        flushTable(uniqueKey);
        renderedElements.push(<div key={uniqueKey} className="h-2"></div>);
        return;
      }

      flushList(uniqueKey);
        flushTable(uniqueKey);
      
      const textStyleClass = isAbstract 
        ? "text-justify italic text-slate-700 leading-relaxed font-normal py-1 pr-1" 
        : "text-justify text-slate-800 leading-relaxed font-normal py-1 pr-1 indent-6";

      renderedElements.push(
        <p key={uniqueKey} className={textStyleClass}>
          {formatInline(line)}
        </p>
      );
    });

    flushList(`final-${lines.length}`);
    flushTable(`final-${lines.length}`);
    return <div className="space-y-1">{renderedElements}</div>;
  };

  const handleExportPDF = () => {
    const element = document.getElementById('academic-print-layout');
    if (!element) return;
    
    // Temporarily apply custom print styles to make sure it looks perfect on A4 pdf
    const opt = {
      margin: [15, 20, 20, 20], // margins in mm [top, left, bottom, right]
      filename: `${doc.title.slice(0, 30) || 'research'}-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        letterRendering: true,
        backgroundColor: '#ffffff',
        windowWidth: 1024 // lock width for better markdown formatting
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] } // Removed avoid tags as they sometimes break layout with html2pdf
    };

    // Use html2pdf which is loaded in index.html
    if (typeof (window as any).html2pdf !== 'undefined') {
      (window as any).html2pdf().set(opt).from(element).save();
    } else {
      alert('مكتبة تصدير الـ PDF غير محملة بالكامل بعد، جاري المحاولة باستخدام الطباعة المباشرة.');
      window.print();
    }
  };

  const handleExportWord = () => {
    // Elegant download of research document in raw HTML Word compatible format matching styling
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <style>
    body { font-family: 'Tajawal', 'Simplified Arabic', serif; direction: rtl; text-align: justify; line-height: 1.6; }
    h1 { font-size: 24pt; text-align: center; margin-top: 50px; color: #0f172a; }
    h2 { font-size: 18pt; margin-top: 30px; color: #1e293b; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; }
    h3 { font-size: 14pt; margin-top: 20px; color: #334155; }
    p { font-size: 12pt; margin-bottom: 15px; }
    .cover { text-align: center; margin-top: 100px; page-break-after: always; }
    .meta { font-size: 14pt; margin-top: 50px; line-height: 2; }
    .section { margin-bottom: 40px; page-break-inside: avoid; }
    .abstract { font-style: italic; background-color: #f8fafc; border-right: 4px solid #10b981; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>`;
    
    const footer = `</body></html>`;
    
    let content = '';

    if (doc.showCoverPage) {
      content += `
        <div class="cover">
          <p style="font-size: 16pt; font-weight: bold;">${doc.university}</p>
          <p style="font-size: 14pt;">${doc.college}</p>
          <p style="font-size: 12pt; margin-bottom: 100px;">${doc.department}</p>
          
          <h1>${doc.title}</h1>
          <p style="font-size: 14pt; color: #475569; margin-bottom: 150px;">${doc.subtitle}</p>
          
          <div class="meta">
            <p><strong>إعداد الباحث:</strong> ${doc.author}</p>
            <p><strong>تحت إشراف الأستاذ:</strong> ${doc.supervisor}</p>
            <p><strong>العام الأكاديمي:</strong> ${doc.academicYear}</p>
          </div>
        </div>
      `;
    }

    content += `
      <div class="section">
        <h2>أولاً: الملخص الأكاديمي (Abstract)</h2>
        <div class="abstract">${doc.abstract.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="section">
        <h2>ثانياً: المقدمة والتمهيد (Introduction)</h2>
        <p>${doc.introduction.replace(/\n/g, '</p><p>')}</p>
      </div>
      <div class="section">
        <h2>ثالثاً: المنهجية وإجراءات الدراسة (Methodology)</h2>
        <p>${doc.methodology.replace(/\n/g, '</p><p>')}</p>
      </div>
      <div class="section">
        <h2>رابعاً: النتائج ومناقشتها (Results & Discussion)</h2>
        <p>${doc.results.replace(/\n/g, '</p><p>')}</p>
      </div>
      <div class="section">
        <h2>خامساً: الخاتمة والتوصيات (Conclusion)</h2>
        <p>${doc.conclusion.replace(/\n/g, '</p><p>')}</p>
      </div>
      <div class="section">
        <h2>المصادر والمراجع (References)</h2>
        <p style="font-family: monospace; white-space: pre-wrap;">${doc.references.replace(/\n/g, '<br>')}</p>
      </div>
    `;

    const sourceHTML = header + content + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const link = document.createElement("a");
    link.href = source;
    link.download = `${doc.title.slice(0, 30) || 'research'}-${Date.now()}.doc`;
    link.click();
  };

  if (!isOpen) return null;

  // Margin spacing helpers based on config
  const marginClasses = {
    compact: 'px-8 py-8 md:px-12 md:py-10',
    normal: 'px-12 py-12 md:px-20 md:py-16',
    wide: 'px-16 py-16 md:px-24 md:py-24'
  }[doc.margins];

  const fontSizeClasses = {
    sm: 'text-xs md:text-sm',
    base: 'text-sm md:text-base leading-relaxed',
    lg: 'text-base md:text-lg leading-loose'
  }[doc.fontSize];

  const lineHeightStyle = {
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    double: 'leading-loose'
  }[doc.lineHeight];

  // Theme borders/colors
  const themeStyles = {
    classic: {
      border: 'border-t-8 border-slate-900',
      textAccent: 'text-slate-900',
      hr: 'border-slate-300',
      accentBg: 'bg-slate-50',
      iconBg: 'bg-slate-600',
      codeAccent: 'text-slate-700 bg-slate-100',
      citeAccent: 'text-slate-700 border-slate-200 bg-slate-50'
    },
    navy: {
      border: 'border-t-8 border-indigo-900',
      textAccent: 'text-indigo-900',
      hr: 'border-indigo-100',
      accentBg: 'bg-indigo-50/50',
      iconBg: 'bg-indigo-600',
      codeAccent: 'text-indigo-700 bg-indigo-50',
      citeAccent: 'text-indigo-700 border-indigo-200 bg-indigo-50'
    },
    gold: {
      border: 'border-t-8 border-amber-600',
      textAccent: 'text-amber-700',
      hr: 'border-amber-200',
      accentBg: 'bg-amber-50/40',
      iconBg: 'bg-amber-600',
      codeAccent: 'text-amber-700 bg-amber-50',
      citeAccent: 'text-amber-700 border-amber-200 bg-amber-50'
    },
    minimal: {
      border: 'border-t-2 border-slate-200',
      textAccent: 'text-slate-800',
      hr: 'border-slate-100',
      accentBg: 'bg-slate-50/40',
      iconBg: 'bg-slate-400',
      codeAccent: 'text-slate-600 bg-slate-50',
      citeAccent: 'text-slate-600 border-slate-200 bg-slate-50'
    },
    emerald: {
      border: 'border-t-8 border-emerald-700',
      textAccent: 'text-emerald-800',
      hr: 'border-emerald-200',
      accentBg: 'bg-emerald-50/50',
      iconBg: 'bg-emerald-600',
      codeAccent: 'text-emerald-700 bg-emerald-50',
      citeAccent: 'text-emerald-700 border-emerald-200 bg-emerald-50'
    },
    'royal-red': {
      border: 'border-t-8 border-red-800',
      textAccent: 'text-red-900',
      hr: 'border-red-200',
      accentBg: 'bg-red-50/50',
      iconBg: 'bg-red-800',
      codeAccent: 'text-red-700 bg-red-50',
      citeAccent: 'text-red-700 border-red-200 bg-red-50'
    },
    purple: {
      border: 'border-t-8 border-purple-800',
      textAccent: 'text-purple-900',
      hr: 'border-purple-200',
      accentBg: 'bg-purple-50/50',
      iconBg: 'bg-purple-600',
      codeAccent: 'text-purple-700 bg-purple-50',
      citeAccent: 'text-purple-700 border-purple-200 bg-purple-50'
    },
    cyan: {
      border: 'border-t-8 border-[#0e7490]',
      textAccent: 'text-[#06b6d4]',
      hr: 'border-cyan-200',
      accentBg: 'bg-cyan-50/50',
      iconBg: 'bg-cyan-600',
      codeAccent: 'text-cyan-700 bg-cyan-50',
      citeAccent: 'text-cyan-700 border-cyan-200 bg-cyan-50'
    }
  }[doc.themeStyle || 'classic'];

  // Dynamic labels for document sections based on active Agent
  const getSectionTitles = () => {
    if (activeAgent?.id === 'CODER') {
      return {
        abstract: 'نظرة عامة على المشروع (Overview)',
        intro: 'الفصل الأول: معمارية النظام (Architecture)',
        methodology: 'الفصل الثاني: منهجية التنفيذ والبيئة (Environment)',
        results: 'الفصل الثالث: تفاصيل الأكواد والخدمات (Implementation)',
        conclusion: 'الفصل الرابع: الاختبار والتطوير المستقبلي (Testing)',
        references: 'المكاتب والمراجع التقنية (Dependencies)'
      };
    }
    if (activeAgent?.id === 'CREATIVE' || activeAgent?.id === 'VIDEO') {
      return {
        abstract: 'الملخص الإبداعي (Creative Brief)',
        intro: 'المشهد الأول: الإلهام والرؤية الفنية (Vision)',
        methodology: 'المشهد الثاني: عناصر التصميم والمنهجية (Elements)',
        results: 'المشهد الثالث: المخرجات المرئية (Output)',
        conclusion: 'المشهد الرابع: الخلاصة والتأثير (Impact)',
        references: 'مصادر الإلهام (Inspiration Board)'
      };
    }
    // Default / Academic
    return {
      abstract: 'ملخص البحث الأكاديمي (Abstract)',
      intro: 'الفصل الأول: المقدمة والخلفية النظرية',
      methodology: 'الفصل الثاني: منهجية وإجراءات البحث',
      results: 'الفصل الثالث: التحليل، النتائج، ومناقشة الدلالات الأكاديمية',
      conclusion: 'الفصل الرابع: الخاتمة والتوصيات العلمية والعملية',
      references: '{sectionLabels.references}'
    };
  };
  
  const sectionLabels = getSectionTitles();

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans rtl" dir="rtl">
      {/* Dynamic Header on Mobile, Side panels on Desktop */}
      
      {/* 1. Document Control Center (Right panel, 40% width on Desktop) */}
      <section className="w-full md:w-[40%] bg-[#0b1329] border-l border-white/5 flex flex-col h-[50dvh] md:h-full shrink-0">
        <div className="p-5 border-b border-white/5 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white text-lg shadow-lg border border-slate-700">
              <i className={activeAgent?.icon || 'fas fa-file-alt'}></i>
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {activeAgent?.id === 'ACADEMIC' ? 'منصة الأبحاث الأكاديمية' :
                 activeAgent?.id === 'CODER' ? 'محرر الوثائق التقنية' :
                 activeAgent?.id === 'CREATIVE' || activeAgent?.id === 'VIDEO' ? 'منصة التصاميم والنصوص الإبداعية' :
                 'محرر المستندات الشامل'}
              </h2>
              <p className="text-[10px] text-slate-400">تنسيق وتصدير PDF & Word بأعلى معايير الدقة</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 bg-slate-950 p-2 overflow-x-auto gap-1">
          {[
            { id: 'cover', label: 'صفحة الغلاف', icon: 'fa-book-open' },
            { id: 'abstract', label: 'الملخص', icon: 'fa-feather' },
            { id: 'content', label: 'الفصول الرئيسية', icon: 'fa-file-alt' },
            { id: 'references', label: 'المراجع', icon: 'fa-quote-left' },
            { id: 'styling', label: 'مظهر الصفحة', icon: 'fa-sliders-h' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className={`fas ${tab.icon} text-[10px]`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {/* COVER TAB */}
          {activeTab === 'cover' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">إدراج صفحة الغلاف</span>
                  <span className="text-[10px] text-slate-400">توليد صفحة غلاف أكاديمية منسقة للجامعة</span>
                </div>
                <button 
                  onClick={() => handleUpdateField('showCoverPage', !doc.showCoverPage)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${doc.showCoverPage ? 'bg-amber-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform ${doc.showCoverPage ? 'transform -translate-x-6' : ''}`}></div>
                </button>
              </div>

              {doc.showCoverPage && (
                <div className="grid grid-cols-1 gap-3.5 pt-2 animate-fadeIn">
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">العنوان الأساسي للبحث</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={doc.title} 
                        onChange={(e) => handleUpdateField('title', e.target.value)}
                        className="w-full text-xs font-bold p-3 bg-white/5 border border-white/5 rounded-xl text-white pl-8 focus:border-amber-500/50 outline-none"
                      />
                      <button onClick={() => openAiHelper('title')} className="absolute left-2.5 top-2.5 w-7 h-7 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors" title="إعادة الصياغة بالذكاء الاصطناعي">
                        <i className="fas fa-magic text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">العنوان الفرعي</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={doc.subtitle} 
                        onChange={(e) => handleUpdateField('subtitle', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white pl-8 focus:border-amber-500/50 outline-none"
                      />
                      <button onClick={() => openAiHelper('subtitle')} className="absolute left-2.5 top-2.5 w-7 h-7 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center transition-colors">
                        <i className="fas fa-magic text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">الجامعة / الجهة</label>
                      <input 
                        type="text" 
                        value={doc.university} 
                        onChange={(e) => handleUpdateField('university', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">الكلية</label>
                      <input 
                        type="text" 
                        value={doc.college} 
                        onChange={(e) => handleUpdateField('college', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">القسم</label>
                      <input 
                        type="text" 
                        value={doc.department} 
                        onChange={(e) => handleUpdateField('department', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">اسم الباحث</label>
                      <input 
                        type="text" 
                        value={doc.author} 
                        onChange={(e) => handleUpdateField('author', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">المشرف الأكاديمي</label>
                      <input 
                        type="text" 
                        value={doc.supervisor} 
                        onChange={(e) => handleUpdateField('supervisor', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">الفصل / العام الدراسي</label>
                      <input 
                        type="text" 
                        value={doc.academicYear} 
                        onChange={(e) => handleUpdateField('academicYear', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">التاريخ المكتوب</label>
                      <input 
                        type="text" 
                        value={doc.date} 
                        onChange={(e) => handleUpdateField('date', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">رقم المستند / الوثيقة</label>
                      <input 
                        type="text" 
                        value={doc.docNumber || ''} 
                        onChange={(e) => handleUpdateField('docNumber', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-bold mb-1.5 block">نص أسفل الشعار</label>
                      <input 
                        type="text" 
                        value={doc.emblemSubtext || ''} 
                        onChange={(e) => handleUpdateField('emblemSubtext', e.target.value)}
                        className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-white focus:border-amber-500/50 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABSTRACT TAB */}
          {activeTab === 'abstract' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">الملخص الأكاديمي (Abstract)</label>
                <button 
                  onClick={() => openAiHelper('abstract')}
                  className="px-2.5 py-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                >
                  <i className="fas fa-magic"></i> صغ بالذكاء الاصطناعي
                </button>
              </div>
              
              <div className="relative">
                <textarea 
                  rows={14}
                  value={doc.abstract} 
                  onChange={(e) => handleUpdateField('abstract', e.target.value)}
                  placeholder="اكتب خلاصة البحث، الأهداف، المنهج المستخدم، والنتائج باختصار وموضوعية..."
                  className="w-full text-xs p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-200 focus:border-amber-500/50 outline-none resize-none leading-relaxed"
                />
                {isGenerating === 'abstract' && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-4">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="text-xs text-amber-400 font-bold">جاري كتابة الملخص بواسطة الباحث الأكاديمي...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              
              {/* Introduction */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">الفصل الأول: المقدمة والتمهيد</label>
                  <button 
                    onClick={() => openAiHelper('introduction')}
                    className="px-2.5 py-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                  >
                    <i className="fas fa-magic"></i> توليد المقدمة
                  </button>
                </div>
                <div className="relative">
                  <textarea 
                    rows={6}
                    value={doc.introduction} 
                    onChange={(e) => handleUpdateField('introduction', e.target.value)}
                    className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-slate-200 outline-none focus:border-amber-500/50 leading-relaxed"
                  />
                  {isGenerating === 'introduction' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Methodology */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">الفصل الثاني: منهجية العمل وإجراءات الدراسة</label>
                  <button 
                    onClick={() => openAiHelper('methodology')}
                    className="px-2.5 py-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                  >
                    <i className="fas fa-magic"></i> توليد المنهجية
                  </button>
                </div>
                <div className="relative">
                  <textarea 
                    rows={6}
                    value={doc.methodology} 
                    onChange={(e) => handleUpdateField('methodology', e.target.value)}
                    className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-slate-200 outline-none focus:border-amber-500/50 leading-relaxed"
                  />
                  {isGenerating === 'methodology' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results & Discussion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">الفصل الثالث: نتائج الدراسة ومناقشتها</label>
                  <button 
                    onClick={() => openAiHelper('results')}
                    className="px-2.5 py-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                  >
                    <i className="fas fa-magic"></i> توليد قسم النتائج
                  </button>
                </div>
                <div className="relative">
                  <textarea 
                    rows={6}
                    value={doc.results} 
                    onChange={(e) => handleUpdateField('results', e.target.value)}
                    className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-slate-200 outline-none focus:border-amber-500/50 leading-relaxed"
                  />
                  {isGenerating === 'results' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conclusion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">الفصل الرابع: الخاتمة والتوصيات المقترحة</label>
                  <button 
                    onClick={() => openAiHelper('conclusion')}
                    className="px-2.5 py-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                  >
                    <i className="fas fa-magic"></i> توليد الخاتمة
                  </button>
                </div>
                <div className="relative">
                  <textarea 
                    rows={6}
                    value={doc.conclusion} 
                    onChange={(e) => handleUpdateField('conclusion', e.target.value)}
                    className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-xl text-slate-200 outline-none focus:border-amber-500/50 leading-relaxed"
                  />
                  {isGenerating === 'conclusion' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* REFERENCES TAB */}
          {activeTab === 'references' && (
            <div className="space-y-4 text-right animate-fadeIn" dir="rtl">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">المصادر والمراجع الأكاديمية</span>
                  <span className="text-[10px] text-slate-400">تنظيم وتوثيق المراجع بحسب اللوائح الأكاديمية اللغوية والمحلية</span>
                </div>
                <button 
                  onClick={() => openAiHelper('references')}
                  className="px-2.5 py-1.5 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center gap-1.5 transition-all font-bold border border-indigo-500/10"
                >
                  <i className="fas fa-magic"></i> تنظيم وتدقيق المراجع بالذكاء الاصطناعي
                </button>
              </div>

              {/* Citation Builder UI Card */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                    <i className="fas fa-quote-right text-[10px]"></i>
                    مُولِّد المراجع والتوثيق التلقائي (Citation Builder)
                  </h4>
                  <span className="text-[9px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-bold">دقة معيارية</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">نمط التوثيق المعتمد</label>
                    <select 
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value as any)}
                      className="w-full text-[11px] p-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 focus:border-amber-500/50 outline-none"
                    >
                      <option value="apa">APA 7th (علمي / إنساني)</option>
                      <option value="ieee">IEEE Standard (هندسي / تقني)</option>
                      <option value="harvard">Harvard (نظام هارفارد الدولي)</option>
                      <option value="chicago">Chicago Style (شيكاغو الإنساني)</option>
                      <option value="mla">MLA 9th (لغوي وأدبي)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">نوع كود المصدر</label>
                    <select 
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as any)}
                      className="w-full text-[11px] p-2 bg-slate-950 border border-white/10 rounded-xl text-slate-200 focus:border-amber-500/50 outline-none"
                    >
                      <option value="book">كتاب / ورقة بحثية</option>
                      <option value="journal">دوريات أو مجلات علمية محکمة</option>
                      <option value="conference">مؤتمر علمي دولي</option>
                      <option value="web">موقع إلكتروني / توثيق رقمي</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">المؤلف أو الجهة المعنية (اللقب، الاسم الأول)</label>
                    <input 
                      type="text"
                      placeholder="مثال: الأسعد، أحمد أو السالم، فهد"
                      value={citationAuthor}
                      onChange={(e) => setCitationAuthor(e.target.value)}
                      className="w-full text-[11px] p-2 bg-slate-950 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">العنوان الكامل للكتاب أو الدراسة العلمية</label>
                    <input 
                      type="text"
                      placeholder="مثال: أثر نظم الذكاء الاصطناعي في التعليم"
                      value={citationTitle}
                      onChange={(e) => setCitationTitle(e.target.value)}
                      className="w-full text-[11px] p-2 bg-slate-950 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">سنة النشر</label>
                      <input 
                        type="text"
                        placeholder="2026"
                        value={citationYear}
                        onChange={(e) => setCitationYear(e.target.value)}
                        className="w-full text-[11px] p-2 bg-slate-950 border border-white/5 rounded-xl text-white text-center outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold mb-1 block">الناشر / المجلة الدورية</label>
                      <input 
                        type="text"
                        placeholder="مثال: دار النشر الأكاديمي، الرياض"
                        value={citationPublisher}
                        onChange={(e) => setCitationPublisher(e.target.value)}
                        className="w-full text-[11px] p-2 bg-slate-950 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold mb-1 block">المجلدات / الصفحات / الرابط (اختياري)</label>
                    <input 
                      type="text"
                      placeholder="مثال: مجلد 5، ص. 12-40 أو الرابط الإلكتروني"
                      value={citationVolumePage}
                      onChange={(e) => setCitationVolumePage(e.target.value)}
                      className="w-full text-[11px] p-2 bg-slate-950 border border-white/5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleInsertCitation}
                    className="flex-1 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-amber-600/15 flex items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-plus-circle"></i>
                    تنسيق ودمج المرجع في البحث
                  </button>
                  
                  {inTextCitation && (
                    <div className="bg-indigo-950/40 border border-indigo-500/20 px-3 py-1 rounded-xl flex items-center gap-2 text-[10px] shrink-0 font-sans">
                      <span className="text-slate-400">الاقتباس النصي:</span>
                      <code className="text-indigo-300 font-bold font-mono text-[11px]">{inTextCitation}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(inTextCitation);
                          alert('تم نسخ الاقتباس النصي للذاكرة!');
                        }}
                        className="text-indigo-400 hover:text-indigo-200 transition-colors"
                        title="نسخ الاقتباس لاستخدامه في متن البحث"
                      >
                        <i className="fas fa-copy text-[9px]"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable references blocks output */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold px-1">المسرد النهائي والمصادر المعتمدة حالياً (يمكن تعديلها مباشرة):</label>
                <div className="relative">
                  <textarea 
                    rows={8}
                    value={doc.references} 
                    onChange={(e) => handleUpdateField('references', e.target.value)}
                    placeholder="مثال:&#10;1. السالم، فهد (2026). الذكاء الاصطناعي الأكاديمي، جامعة الرياض..."
                    className="w-full text-xs font-mono p-3.5 bg-slate-950 border border-white/5 rounded-2xl text-slate-200 focus:border-amber-500/50 outline-none resize-none leading-relaxed text-right"
                  />
                  {isGenerating === 'references' && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-4">
                      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <span className="text-xs text-amber-400 font-bold">جاري ترتيب وتنسيق المراجع البحثية...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STYLING TAB */}
          {activeTab === 'styling' && (
            <div className="space-y-4 overflow-y-auto max-h-[42dvh] md:max-h-[66vh] pr-1 pb-6 custom-scrollbar text-right" dir="rtl">
              
              <div>
                <label className="text-xs font-black text-slate-300 mb-2 block flex items-center gap-2">
                  <i className="fas fa-palette text-amber-500"></i>
                  المظهر والتنسيق اللوني للبحث الأكاديمي
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic', label: 'كلاسيكي رسمي (رمادي)', desc: 'مظهر البحث العلمي التقليدي الرصين' },
                    { id: 'navy', label: 'حديث أنيق (نيلي)', desc: 'تنسيق حديث مناسب للمشاريع والرسائل' },
                    { id: 'gold', label: 'فاخر ومزخرف (ذهبي)', desc: 'لأوراق المؤتمرات والدرجات الرفيعة' },
                    { id: 'minimal', label: 'بسيط وخام', desc: 'تنسيق بسيط للمسودات والتقارير السريعة' },
                    { id: 'emerald', label: 'ملكي سعودي (أخضر)', desc: 'تنسيق وطني ملائم لجامعات المملكة' },
                    { id: 'royal-red', label: 'عنابي فاخر', desc: 'مثالي للعلوم الاجتماعية والإنسانيات' },
                    { id: 'purple', label: 'بنفسجي أكاديمي', desc: 'تنسيق ملون ومشرق للبحوث المبتكرة' },
                    { id: 'cyan', label: 'تقني علمي (سيان)', desc: 'تنسيق حديث لبحوث الذكاء الاصطناعي والتقنية' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => handleUpdateField('themeStyle', style.id)}
                      className={`p-2.5 text-right rounded-xl border text-[11px] transition-all duration-200 ${
                        doc.themeStyle === style.id 
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-extrabold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          style.id === 'classic' ? 'bg-slate-400' :
                          style.id === 'navy' ? 'bg-indigo-600' :
                          style.id === 'gold' ? 'bg-amber-600' :
                          style.id === 'minimal' ? 'bg-slate-200' :
                          style.id === 'emerald' ? 'bg-emerald-600' :
                          style.id === 'royal-red' ? 'bg-red-700' :
                          style.id === 'purple' ? 'bg-purple-600' : 'bg-cyan-500'
                        }`} />
                        {style.label}
                      </p>
                      <p className="text-[9px] opacity-65 mt-0.5 leading-snug">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">حجم الخط</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'sm', label: 'صغير (صياغة مكثفة)' },
                      { id: 'base', label: 'متوسط (معياري)' },
                      { id: 'lg', label: 'كبير (مريح للقراءة)' }
                    ].map(sz => (
                      <button
                        key={sz.id}
                        onClick={() => handleUpdateField('fontSize', sz.id)}
                        className={`py-1 rounded-lg border text-xs font-bold transition-all ${
                          doc.fontSize === sz.id 
                          ? 'bg-white/15 border-white/20 text-white' 
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">الهوامش والتباعد</label>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: 'compact', label: 'هوامش ضيقة' },
                      { id: 'normal', label: 'هوامش عادية' },
                      { id: 'wide', label: 'هوامش عريضة' }
                    ].map(mrg => (
                      <button
                        key={mrg.id}
                        onClick={() => handleUpdateField('margins', mrg.id)}
                        className={`py-1 rounded-lg border text-xs font-bold transition-all ${
                          doc.margins === mrg.id 
                          ? 'bg-white/15 border-white/20 text-white' 
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {mrg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* EMBLEM SELECTOR */}
              <div className="border-t border-white/5 pt-3">
                <label className="text-xs font-bold text-slate-300 mb-2 block flex items-center gap-2">
                  <i className="fas fa-certificate text-purple-400"></i>
                  تصميم الشعار أو الترويسة الرئيسية
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ksa', label: 'شعار المملكة العربية السعودية (التاج الملكي)', icon: 'fa-crown text-amber-500' },
                    { id: 'academic', label: 'مؤسسة بحثية أكاديمية (قبعة التخرج)', icon: 'fa-graduation-cap text-indigo-400' },
                    { id: 'tech', label: 'مختبر الذكاء الاصطناعي والتقنية', icon: 'fa-cube text-cyan-400' },
                    { id: 'shield', label: 'درع الجودة والاعتماد الدولي للأبحاث', icon: 'fa-shield-halved text-red-400' },
                    { id: 'none', label: 'بدون ترويسة رئيسية', icon: 'fa-ban text-slate-500' }
                  ].map(emb => (
                    <button
                      key={emb.id}
                      onClick={() => handleUpdateField('emblemStyle', emb.id)}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-start gap-1 transition-all ${
                        doc.emblemStyle === emb.id 
                        ? 'bg-white/15 border-white/20 text-white' 
                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <i className={`fas ${emb.icon} text-xs`}></i>
                        {emb.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* INTERACTIVE TOGGLES */}
              <div className="border-t border-white/5 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">العلامة المائية للبحث (Watermark)</span>
                    <span className="text-[10px] text-slate-400">إظهار علامة مائية مائلة في خلفية الصفحات</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateField('showWatermark', !doc.showWatermark)}
                    className={`w-11 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${doc.showWatermark ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doc.showWatermark ? 'transform -translate-x-5' : ''}`}></div>
                  </button>
                </div>

                {doc.showWatermark && (
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-300 block mb-1">نص العلامة المائية للطباعة:</span>
                    <input 
                      type="text"
                      className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-1.5 text-white outline-none focus:border-amber-500"
                      value={doc.watermarkText || ''}
                      onChange={(e) => handleUpdateField('watermarkText', e.target.value)}
                      placeholder="مثال: وثيقة دراسية غير قابلة للتوزيع"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">ختم وتصديق المشرف الأكاديمي</span>
                    <span className="text-[10px] text-slate-400">توقيع رسمي وختم اعتماد رقمي مشفر</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateField('showStamp', !doc.showStamp)}
                    className={`w-11 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${doc.showStamp ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doc.showStamp ? 'transform -translate-x-5' : ''}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">فهرس محتويات ذكي (TOC)</span>
                    <span className="text-[10px] text-slate-400">توليد جدول الفصول الأكاديمية تلقائياً</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateField('showTableOfContents', !doc.showTableOfContents)}
                    className={`w-11 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${doc.showTableOfContents ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doc.showTableOfContents ? 'transform -translate-x-5' : ''}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">أرقام وتذييل الصفحات</span>
                    <span className="text-[10px] text-slate-400">إضافة لوحة صفحات معياري للطباعة</span>
                  </div>
                  <button 
                    onClick={() => handleUpdateField('showPageNumbers', !doc.showPageNumbers)}
                    className={`w-11 h-5.5 rounded-full transition-colors relative flex items-center px-0.5 ${doc.showPageNumbers ? 'bg-amber-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${doc.showPageNumbers ? 'transform -translate-x-5' : ''}`}></div>
                  </button>
                </div>
              </div>

              {/* FOOTER CUSTOM TEXT */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-[10px] text-slate-300 block mb-1">نص تذييل مخصص للصفحات:</span>
                <input 
                  type="text"
                  className="w-full text-xs bg-slate-950 border border-white/10 rounded-lg p-1.5 text-white outline-none focus:border-amber-500"
                  value={doc.customFooterText || ''}
                  onChange={(e) => handleUpdateField('customFooterText', e.target.value)}
                  placeholder="مثال: ورقة عمل - قسم البرمجيات"
                />
              </div>

            </div>
          )}

        </div>
      </section>

      {/* 2. Dynamic Instant Document Preview (Right panel, 60% width on Desktop) */}
      <section className="flex-1 h-[50dvh] md:h-full p-4 md:p-8 overflow-y-auto bg-slate-950 flex flex-col items-center custom-scrollbar">
        
        {/* Floating Print & Export Controls */}
        <div className="w-full max-w-3xl mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-xl select-none" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-white">معاينة المستند الأكاديمي المباشر</span>
              <p className="text-[9px] text-slate-400 font-sans uppercase">النمط البحثي المعتمد: {citationStyle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-900/20 flex items-center gap-1.5"
            >
              <i className="fas fa-file-pdf"></i>
              تصدير PDF أكاديمي
            </button>
            <button 
              onClick={handleExportWord}
              className="px-4 py-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
            >
              <i className="fas fa-file-word"></i>
              تنزيل ميكروسوفت وورد (DOCX)
            </button>
          </div>
        </div>

        {/* Paper Container (A4 Printable Area) */}
        <div className="w-full max-w-3xl flex-1 pb-16 overflow-x-hidden">
          <div 
            id="academic-print-layout" 
            ref={previewRef}
            className={`w-full bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-300 relative border border-slate-200 text-right ${marginClasses} ${themeStyles.border} min-h-[800px] md:min-h-[1120px]`}
            style={{ fontFamily: "'Amiri', 'Tajawal', serif" }}
          >
            {/* Watermark layer if enabled */}
            {doc.showWatermark && doc.watermarkText && (
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] select-none pointer-events-none overflow-hidden z-0">
                <span className="text-4xl md:text-6xl font-sans font-black text-slate-900 tracking-widest -rotate-45 block uppercase whitespace-nowrap">
                  {doc.watermarkText}
                </span>
              </div>
            )}

            {/* A4 Page Content Area */}
            <div className="space-y-8 z-10 relative">
              
              {/* COVER PAGE (Optional but Beautiful & Truly Academic) */}
              {doc.showCoverPage && (
                <div className="text-center py-10 md:py-20 flex flex-col justify-between relative border-[8px] md:border-[12px] border-double border-slate-100 m-4 md:m-8 px-4 md:px-10 min-h-[700px] md:min-h-[940px] page-break-after-always">
                  <div className="absolute top-0 left-0 w-full h-full border border-slate-200 pointer-events-none" style={{ margin: '8px', width: 'calc(100% - 16px)', height: 'calc(100% - 16px)' }}></div>
                  <div className="space-y-4 font-serif relative z-10 mt-8 md:mt-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-slate-50 border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-sm">
                      <i className="fas fa-university text-xl md:text-2xl text-slate-300"></i>
                    </div>
                    <p className="text-base md:text-lg tracking-widest text-slate-900 font-bold uppercase px-2">{doc.university}</p>
                    <p className="text-sm tracking-wide text-slate-800">{doc.college}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 font-sans tracking-widest">{doc.department}</p>
                  </div>
                  
                  <div className="space-y-6 md:space-y-8 my-16 md:my-20 font-serif relative z-10 px-2 md:px-10">
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent w-full md:w-3/4 mx-auto mb-8 md:mb-10"></div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-950 leading-relaxed md:leading-[1.6] tracking-tight mx-auto px-2 md:px-4">
                      {doc.title}
                    </h1>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent w-full md:w-3/4 mx-auto mt-8 md:mt-10"></div>
                    <p className="text-sm md:text-base text-slate-700 max-w-xl mx-auto leading-relaxed font-normal italic mt-6 md:mt-8 px-4">
                      {doc.subtitle}
                    </p>
                  </div>

                  {/* Clean Scholarly Author Details Block */}
                  <div className="w-full max-w-xs md:max-w-md mx-auto text-right space-y-4 md:space-y-5 mt-8 md:mt-10 mb-6 md:mb-8 py-6 md:py-10 px-4 md:px-8 border border-slate-200 bg-slate-50/50 relative z-10 shadow-sm">
                    <p className="text-xs md:text-sm font-serif text-slate-900 flex flex-col md:flex-row items-center md:justify-between border-b border-slate-200/60 pb-3 gap-2 md:gap-0 text-center md:text-right">
                      <span className="text-slate-500 font-sans ml-0 md:ml-4 text-[10px] md:text-xs font-semibold">إعداد الباحث الدراسي:</span> 
                      <strong className="font-bold text-sm md:text-base">{doc.author || 'أحمد بن عبد الله الأسعد'}</strong>
                    </p>
                    <p className="text-xs md:text-sm font-serif text-slate-900 flex flex-col md:flex-row items-center md:justify-between border-b border-slate-200/60 pb-3 gap-2 md:gap-0 text-center md:text-right">
                      <span className="text-slate-500 font-sans ml-0 md:ml-4 text-[10px] md:text-xs font-semibold">المشرف الأكاديمي المسؤول:</span> 
                      <strong className="font-bold text-sm md:text-base">{doc.supervisor || 'الأستاذ فهد السالم'}</strong>
                    </p>
                    <p className="text-xs md:text-sm font-serif text-slate-900 flex flex-col md:flex-row items-center md:justify-between border-b border-slate-200/60 pb-3 gap-2 md:gap-0 text-center md:text-right">
                      <span className="text-slate-500 font-sans ml-0 md:ml-4 text-[10px] md:text-xs font-semibold">تاريخ التقديم والمعايرة:</span> 
                      <span className="font-medium font-sans text-xs md:text-sm">{doc.date}</span>
                    </p>
                    <p className="text-xs md:text-sm font-serif text-slate-900 flex flex-col md:flex-row items-center md:justify-between border-b border-slate-200/60 pb-3 gap-2 md:gap-0 text-center md:text-right">
                      <span className="text-slate-500 font-sans ml-0 md:ml-4 text-[10px] md:text-xs font-semibold">العام الدراسي والمقرر:</span> 
                      <strong className="font-bold text-xs md:text-sm tracking-widest">{doc.academicYear}</strong>
                    </p>
                    {doc.docNumber && (
                      <p className="text-xs md:text-sm font-serif text-slate-900 flex flex-col md:flex-row items-center md:justify-between pb-1 gap-2 md:gap-0 text-center md:text-right">
                        <span className="text-slate-500 font-sans ml-0 md:ml-4 text-[10px] md:text-xs font-semibold">الرقم المرجعي للمستند:</span> 
                        <span className="font-medium font-mono text-[10px] md:text-xs bg-white px-2 py-1 border border-slate-200">{doc.docNumber}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-[8px] md:text-[10px] text-slate-400 font-sans tracking-widest relative z-10 mt-6 md:mt-8 uppercase mb-4 md:mb-0">
                    تمت الصياغة والتدقيق والتكامل العلمي بواسطة النظم الأكاديمية الذكية
                  </div>
                </div>
              )}

              {/* MAIN RESEARCH BODIES & SECTIONS */}
              <div className={`space-y-10 ${fontSizeClasses} ${lineHeightStyle}`}>
                
                {/* 1. Abstract (Academic style: center indented, no background colorful borders, clean typography) */}
                <div className="my-10 mx-6 text-center" >
                  <h2 className="text-base font-bold text-slate-900 mb-4 text-center tracking-normal font-sans">{sectionLabels.abstract}</h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif italic text-xs px-10 border-r border-l border-slate-200">
                    {renderAcademicMarkdown(doc.abstract, true) || 'لم يتم إدخال ملخص للبحث حتى الآن.'}
                  </div>
                </div>

                {/* Dynamic Table of Contents (Academic Style: dotted line layout, zero dashboard borders) */}
                {doc.showTableOfContents && (
                  <div className="border-t border-b border-slate-300 py-6 my-10 font-serif" >
                    <h2 className="text-sm font-bold text-slate-950 mb-6 text-center font-sans tracking-wide">{activeAgent?.id === "ACADEMIC" ? "فهرس محتويات الورقة الأكاديمية" : activeAgent?.id === "CODER" ? "فهرس المستند التقني" : "فهرس المحتويات"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-xs font-serif text-slate-700">
                      <div className="flex justify-between items-baseline">
                        <span>١. {sectionLabels.abstract}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">أ</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>٢. {sectionLabels.intro}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">١</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>٣. {sectionLabels.methodology}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">٢</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>٤. {sectionLabels.results}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">٣</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>٥. {sectionLabels.conclusion}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">٤</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>٦. {sectionLabels.references}</span>
                        <span className="flex-1 mx-2 border-b border-dotted border-slate-300"></span>
                        <span className="text-slate-900 font-bold font-sans">٥</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Introduction (Academic Style) */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.intro}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">1.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">
                    {doc.introduction ? renderAcademicMarkdown(doc.introduction) : 'تمهيد ومقدمة البحث تدرج هنا لبناء وتكامل الأساس العلمي للموضوع.'}
                  </div>
                </div>

                {/* 3. Methodology */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.methodology}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">2.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">
                    {doc.methodology ? renderAcademicMarkdown(doc.methodology) : 'منهجية البحث العلمي وجمع البيانات والمقابلات والملاحظات البحثية تدرج هنا بالتفصيل.'}
                  </div>
                </div>

                {/* 4. Results & Discussion */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.results}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">3.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">
                    {doc.results ? renderAcademicMarkdown(doc.results) : 'نتائج العمل وجداول الإحصاء وصنع الرسومات البيانية والمقارنات تدرج هنا.'}
                  </div>
                </div>

                {/* 5. Conclusion */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.conclusion}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">4.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">
                    {doc.conclusion ? renderAcademicMarkdown(doc.conclusion) : 'التوصيات والاستخلاصات النهائية للباحث ومقترحات الدراسات المستقبلية.'}
                  </div>
                </div>

                {/* 6. References */}
                <div className="pt-6 mt-12 border-t border-slate-300 font-serif px-2 md:px-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm md:text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                       {sectionLabels.references}
                    </h2>
                    <span className="text-[10px] bg-slate-50 text-slate-600 px-3 py-1 border border-slate-200 rounded font-bold uppercase font-sans tracking-wide">
                      التوثيق المعتمد: {citationStyle.toUpperCase()}
                    </span>
                  </div>
                  
                  {doc.references ? (
                    <div className="space-y-4 pr-1 font-serif py-1">
                      {doc.references.split('\n').filter(line => line.trim()).map((line, idx) => {
                        const match = line.match(/^(\d+[\.\-\u0640]*)\s*(.*)/);
                        const numPrefix = match ? match[1] : `${idx + 1}.`;
                        const refText = match ? match[2] : line;
                        
                        const styledText = refText.replace(/(\(\d{4}\))/g, '<strong class="text-slate-950 font-bold font-serif">$1</strong>');

                        return (
                          <div key={idx} className="flex gap-2 text-right text-xs md:text-sm text-slate-800 leading-relaxed items-start pb-3.5 border-b border-slate-100 last:border-0 last:pb-0 font-serif">
                            <span className="font-serif font-bold text-slate-950 shrink-0 min-w-[20px] md:min-w-[24px] text-center font-sans">
                              [{numPrefix.replace(/[\.\-]/g, '').trim()}]
                            </span>
                            <span className="flex-1 text-justify" dangerouslySetInnerHTML={{ __html: styledText }} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium italic text-center py-4">
                      لا توجد مصادر أو مراجع أكاديمية مدخلة حالياً.
                    </p>
                  )}
                </div>

                {/* Custom Stamp & Signature Block (Academic Style: borderless signatures grid) */}
                {doc.showStamp && (
                  <div className="pt-8 mt-12 flex justify-between items-center border-t border-slate-300 font-serif">
                    <div className="space-y-2 text-right">
                      <p className="text-xs font-bold text-slate-500 tracking-wide">الاعتماد والتصديق العلمي للمشرف للأطروحة:</p>
                      <p className="text-sm text-slate-900 font-medium">توقيع المشرف المسؤول: <span className="font-serif border-b-2 border-solid border-slate-500 pb-0.5 px-8 font-black text-slate-950 text-base">{doc.supervisor || 'الأستاذ فهد السالم'}</span></p>
                      <p className="text-[10px] text-slate-400 font-sans font-semibold">قسم البحث العلمي ونظم التقييم المعرّفة رقمياً بالجامعة</p>
                    </div>
                    
                    <div className="relative flex items-center justify-center shrink-0 select-none">
                      <div className="w-24 h-24 rounded-full border-2 border-double border-emerald-700/60 flex flex-col items-center justify-center text-center p-2 text-emerald-800 rotate-6 bg-transparent">
                        <span className="text-[7px] font-black uppercase leading-tight font-sans">معتمد أكاديمياً</span>
                        <i className="fas fa-certificate text-sm text-emerald-600 my-0.5 animate-pulse"></i>
                        <span className="text-[5px] font-bold">الترميز الموثق</span>
                        <span className="text-[4px] font-mono opacity-85 font-black">ID: AR-9872X</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Page Footer decor block */}
            <div className="mt-12 pt-4 border-t flex justify-between items-center text-[9px] text-slate-400 z-10 relative" style={{ borderColor: '#f1f5f9' }}>
              <span>{doc.customFooterText || 'تمت الصياغة بواسطة الوكيل الذكي المتكامل - AI Multi-Agent Hub'}</span>
              {doc.showPageNumbers && (
                <span className="font-bold font-sans">صفحة التوثيق الأولى &bull; 1 من 1</span>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 3. NESTED AI GENERATION PARAMETERS PROMPT MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl p-6 shadow-2xl relative" dir="rtl">
            <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
              <i className="fas fa-magic text-amber-400"></i>
              توليد صياغة أكاديمية رصينة
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اكتب ما تود تضمينه في هذا القسم باختصار، وسيقوم الوكيل الأكاديمي بنسج مقال متكامل بجودة رفيعة ومطابق للهيكل العلمي.
            </p>

            <textarea 
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full text-xs p-3 bg-white/5 border border-white/5 rounded-2xl text-white outline-none focus:border-amber-500/50 leading-relaxed mb-4 resize-none text-right"
              placeholder="اكتب التوجيه أو المحاور هنا..."
            />

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleAiRefine}
                className="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                اصنع المحتوى الآن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResearchWorkspace;
