import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  Header, 
  Footer,
  PageNumber,
  PageBreak,
  HeightRule,
  ImageRun
} from 'docx';
import { saveAs } from 'file-saver';

interface WordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  initialStyle?: 'academic' | 'creative' | 'standard';
}

// Inline Markdown Parser to detect Bold-Italics
const parseInlineMarkdown = (text: string) => {
  const segments: Array<{ text: string; bold?: boolean; italic?: boolean }> = [];
  let index = 0;
  const regex = /(\*\*\*|__\*|\*\*\*|__|\*\*|\*|_)(.*?)\1/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > index) {
      segments.push({ text: text.substring(index, match.index) });
    }
    const indicator = match[1];
    const matchContent = match[2];
    const isBold = indicator === '**' || indicator === '__' || indicator === '***';
    const isItalic = indicator === '*' || indicator === '_' || indicator === '***';
    segments.push({ text: matchContent, bold: isBold, italic: isItalic });
    index = regex.lastIndex;
  }

  if (index < text.length) {
    segments.push({ text: text.substring(index) });
  }

  return segments;
};

// Word-specific semantic table line parsing helper
const renderWordTable = (tableLines: string[]): string => {
  if (tableLines.length === 0) return '';
  const rows = tableLines.map(line => {
    const cells = line.split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    return cells;
  });

  const headers = rows[0] || [];
  const bodyRows = rows.slice(1).filter(r => !r.every(cell => /^:?-+:?$/.test(cell)));

  let html = `<div class="word-table-wrapper"><table class="preview-table">`;
  html += '<thead><tr>';
  headers.forEach(h => {
    html += `<th>${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  bodyRows.forEach((row, rIdx) => {
    html += `<tr class="${rIdx % 2 === 0 ? 'row-even' : 'row-odd'}">`;
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
};

// Helper to convert Markdown to structured preview HTML
const markdownToWordPreviewHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  // Strip cover-data divs if any
  let txt = markdown.replace(/<div\s+id="cover-data"[^>]*>([\s\S]*?)<\/div>/gi, '');
  txt = txt.replace(/\r\n/g, '\n');

  txt = txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tables: string[] = [];
  const lines = txt.split('\n');
  let inTable = false;
  let currentTableLines: string[] = [];
  let postTableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      currentTableLines.push(line);
    } else {
      if (inTable) {
        tables.push(renderWordTable(currentTableLines));
        postTableLines.push(`%%TABLEBLOCK${tables.length - 1}%%`);
        currentTableLines = [];
        inTable = false;
      }
      postTableLines.push(lines[i]);
    }
  }
  if (inTable) {
    tables.push(renderWordTable(currentTableLines));
    postTableLines.push(`%%TABLEBLOCK${tables.length - 1}%%`);
  }
  txt = postTableLines.join('\n');

  // Blockquote lines processing
  const bqLines = txt.split('\n');
  let inBq = false;
  let currentBqLines: string[] = [];
  let postBqLines: string[] = [];
  for (let i = 0; i < bqLines.length; i++) {
    const line = bqLines[i];
    const match = line.trim().match(/^&gt;\s*(.*)$/);
    if (match) {
      inBq = true;
      currentBqLines.push(match[1]);
    } else {
      if (inBq) {
        postBqLines.push(`<blockquote>${currentBqLines.join('<br>')}</blockquote>`);
        currentBqLines = [];
        inBq = false;
      }
      postBqLines.push(line);
    }
  }
  if (inBq) {
    postBqLines.push(`<blockquote>${currentBqLines.join('<br>')}</blockquote>`);
  }
  txt = postBqLines.join('\n');

  txt = txt.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  txt = txt.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  txt = txt.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  txt = txt.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  
  txt = txt.replace(/^\s*---\s*$/gm, '<hr />');
  txt = txt.replace(/\[(فاصل_صفحات|page_break)\]/g, '<div class="docx-page-break" data-page-break="true"></div>');

  // Process list lines
  const listLines = txt.split('\n');
  let inList = false;
  let isOrderedList = false;
  let postListLines: string[] = [];

  for (let i = 0; i < listLines.length; i++) {
    const line = listLines[i].trim();
    const isBulletMatch = line.startsWith('- ') || line.startsWith('* ');
    const isOrderMatch = !isBulletMatch && /^\d+\.\s+/.test(line);

    if (isBulletMatch || isOrderMatch) {
      const cleanText = isBulletMatch 
        ? line.substring(2) 
        : line.replace(/^\d+\.\s+/, '');

      if (!inList || isOrderedList !== isOrderMatch) {
        if (inList) postListLines.push(isOrderedList ? '</ol>' : '</ul>');
        inList = true;
        isOrderedList = isOrderMatch;
        postListLines.push(isOrderedList ? '<ol>' : '<ul>');
      }
      postListLines.push(`<li>${cleanText}</li>`);
    } else {
      if (inList) {
        postListLines.push(isOrderedList ? '</ol>' : '</ul>');
        inList = false;
      }
      postListLines.push(listLines[i]);
    }
  }
  if (inList) {
    postListLines.push(isOrderedList ? '</ol>' : '</ul>');
  }
  txt = postListLines.join('\n');

  // Paragraph processing on final text lines
  const pLines = txt.split('\n');
  const finalizedLines = pLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h1') || trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<h4') ||
        trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<li') || trimmed.startsWith('</ul') || trimmed.startsWith('</ol') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('</blockquote') || trimmed.startsWith('<div') || trimmed.startsWith('</div') ||
        trimmed.startsWith('<table') || trimmed.startsWith('<tr') || trimmed.startsWith('<th') || trimmed.startsWith('<td') || trimmed.startsWith('</table') ||
        trimmed.startsWith('<hr') || trimmed.includes('%%TABLEBLOCK')) {
      return line;
    }
    return `<p class="doc-paragraph">${line}</p>`;
  });
  txt = finalizedLines.join('\n');

  // Reinject Tables
  tables.forEach((tHtml, idx) => {
    txt = txt.replace(`%%TABLEBLOCK${idx}%%`, tHtml);
  });

  // Basic inline formatting replacements
  txt = txt.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  txt = txt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  txt = txt.replace(/\*(.*?)\*/g, '<em>$1</em>');
  txt = txt.replace(/__(.*?)__/g, '<strong>$1</strong>');
  txt = txt.replace(/_(.*?)_/g, '<em>$1</em>');

  // Image replacement support to render stunning images or diagrams directly inside preview!
  txt = txt.replace(/!\[(.*?)\]\((.*?)\)/g, '<div class="my-4 flex flex-col items-center select-none"><img src="$2" alt="$1" class="max-w-[85%] max-h-[300px] rounded-lg shadow-sm border border-slate-200 object-contain" referrerPolicy="no-referrer" /><span class="text-xs text-slate-500 mt-1 font-sans">$1</span></div>');

  return txt;
};

// Elite Predefined Theme Presets
const STYLE_PRESETS = [
  {
    id: 'standard',
    name: 'النمط الرسمي المعتمد (Corporate)',
    icon: 'fas fa-building',
    theme: {
      fontFamily: 'Tajawal',
      h1Color: '#0f172a',
      bodyTextColor: '#1e293b',
      pageBgColor: '#ffffff',
      accentColor: '#2563eb',
      tableHeaderBg: '#1e40af',
      blockquoteBg: '#f8fafc',
      baseFontSize: 11,
      headingFontSize: 18,
      lineHeight: 1.7,
      pageMargin: 16,
      borderColor: '#94a3b8',
      bgLight: '#f8fafc',
      showBorderFrame: false,
      customTitle: 'التقرير الذكي المنسّق والمدقق',
      customSubtitle: 'تم تنسيق وتصدير هذا المستند علمياً بأعلى دقة وتصميم جمالي',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic',
    name: 'الأكاديمي البحت المبسط (Academic Simple)',
    icon: 'fas fa-graduation-cap',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#1a1a1a',
      bodyTextColor: '#2d3748',
      pageBgColor: '#ffffff',
      accentColor: '#334155',
      tableHeaderBg: '#475569',
      blockquoteBg: '#f1f5f9',
      baseFontSize: 12.5,
      headingFontSize: 22,
      lineHeight: 1.85,
      pageMargin: 20,
      borderColor: '#cbd5e1',
      bgLight: '#f1f5f9',
      showBorderFrame: false,
      customTitle: 'دراسة وأبحاث علمية كلاسيكية',
      customSubtitle: 'مستند علمي محكم مُنسّق بالكامل ومجهّز للتصدير الأكاديمي',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'double',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_harvard',
    name: 'منهج هارفارد الأكاديمي الدولي (Harvard Research Template)',
    icon: 'fas fa-chalkboard-teacher',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#0f172a',
      bodyTextColor: '#1e293b',
      pageBgColor: '#fcfcfc',
      accentColor: '#7f1d1d',
      tableHeaderBg: '#7f1d1d',
      blockquoteBg: '#fef2f2',
      baseFontSize: 13,
      headingFontSize: 24,
      lineHeight: 1.9,
      pageMargin: 24,
      borderColor: '#fca5a5',
      bgLight: '#fef2f2',
      showBorderFrame: true,
      customTitle: 'دراسة بحثية محكّمة وفق معايير النشر الدولي',
      customSubtitle: 'ورقة علمية خاضعة للتحكيم الدولي والتوثيق المنهجي الصارم (APA 7th)',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_oxford',
    name: 'منهج أكسفورد الأكاديمي العريق (Oxford University Style)',
    icon: 'fas fa-university',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#0c2340',
      bodyTextColor: '#1f2937',
      pageBgColor: '#fcfdfd',
      accentColor: '#0c2340',
      tableHeaderBg: '#0c2340',
      blockquoteBg: '#f0f4f8',
      baseFontSize: 12.5,
      headingFontSize: 23,
      lineHeight: 1.85,
      pageMargin: 22,
      borderColor: '#94a3b8',
      bgLight: '#f0f4f8',
      showBorderFrame: true,
      customTitle: 'ورقة بحثية متقدمة وفق دليل أكسفورد للنشر',
      customSubtitle: 'أطروحة علمية مدققة ومراجعة ومنسقة بالكامل للمؤتمرات الدولية',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_chicago',
    name: 'دليل شيكاغو التاريخي للأبحاث (Chicago Manual Style)',
    icon: 'fas fa-feather-alt',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#1e293b',
      bodyTextColor: '#334155',
      pageBgColor: '#fdfcfb',
      accentColor: '#475569',
      tableHeaderBg: '#334155',
      blockquoteBg: '#f8fafc',
      baseFontSize: 13,
      headingFontSize: 22,
      lineHeight: 1.9,
      pageMargin: 24,
      borderColor: '#94a3b8',
      bgLight: '#f8fafc',
      showBorderFrame: false,
      customTitle: 'بحث تخصصي في العلوم الإنسانية والتاريخ ومقالات الرأي',
      customSubtitle: 'مستند مجهز لتوثيق المصادر والهوامش والمراجع بطريقة شيكاغو المعتمدة',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_apa7',
    name: 'دليل الجمعية الأمريكية لعلم النفس (APA 7th Format)',
    icon: 'fas fa-brain',
    theme: {
      fontFamily: 'Almarai',
      h1Color: '#1e293b',
      bodyTextColor: '#0f172a',
      pageBgColor: '#ffffff',
      accentColor: '#0284c7',
      tableHeaderBg: '#1e293b',
      blockquoteBg: '#f8fafc',
      baseFontSize: 11.5,
      headingFontSize: 20,
      lineHeight: 2.0,
      pageMargin: 25.4,
      borderColor: '#e2e8f0',
      bgLight: '#f8fafc',
      showBorderFrame: false,
      customTitle: 'تقرير علمي تجريبي وفق معيار APA السابع',
      customSubtitle: 'منهجية دقيقة لتقديم الدراسات النفسية، والاجتماعية، والتربوية العالمية',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_islamic',
    name: 'منهج التحقيق والمخطوطات الإسلامية (Islamic Classic Study)',
    icon: 'fas fa-scroll',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#044e11',
      bodyTextColor: '#111827',
      pageBgColor: '#fbf8f3',
      accentColor: '#c29d38',
      tableHeaderBg: '#056316',
      blockquoteBg: '#f4fbf5',
      baseFontSize: 13.5,
      headingFontSize: 24,
      lineHeight: 1.95,
      pageMargin: 20,
      borderColor: '#fcd34d',
      bgLight: '#f4fbf5',
      showBorderFrame: false,
      customTitle: 'تحقيق مخطوطة تاريخية ورسالة علمية في العلوم الشرعية والأدبية',
      customSubtitle: 'مستند مصمم بجماليات الخط المشرقي والأميري ليتناسب مع رصانة التحقيق العلمي',
      pageOrientation: 'portrait',
      fontWeight: 'bold',
      borderStyle: 'double',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'academic_ieee',
    name: 'منهج جمعية مهندسي الكهرباء والإلكترونيات (IEEE Journal Template)',
    icon: 'fas fa-microchip',
    theme: {
      fontFamily: 'Tajawal',
      h1Color: '#00629b',
      bodyTextColor: '#111827',
      pageBgColor: '#ffffff',
      accentColor: '#00629b',
      tableHeaderBg: '#00629b',
      blockquoteBg: '#f0f7fc',
      baseFontSize: 10,
      headingFontSize: 18,
      lineHeight: 1.6,
      pageMargin: 15,
      borderColor: '#94a3b8',
      bgLight: '#f0f7fc',
      showBorderFrame: false,
      customTitle: 'دراسة تطبيقية محكمة لشبكات الحوسبة وبحوث الإلكترونيات الهندسية',
      customSubtitle: 'ورقة بحثية متوافقة مسبقاً مع بنية العمودين الفنية لمؤتمرات ومجلات IEEE الدولية',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 2,
      textAlignment: 'justify'
    }
  },
  {
    id: 'thesis_golden',
    name: 'أطروحة الدكتوراه المذهبة (Elite Classical Thesis)',
    icon: 'fas fa-book-reader',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#451a03',
      bodyTextColor: '#1a0c02',
      pageBgColor: '#faf7f2',
      accentColor: '#b45309',
      tableHeaderBg: '#78350f',
      blockquoteBg: '#fffbeb',
      baseFontSize: 13,
      headingFontSize: 23,
      lineHeight: 1.8,
      pageMargin: 22,
      borderColor: '#f59e0b',
      bgLight: '#fffbeb',
      showBorderFrame: false,
      customTitle: 'أطروحة دكتوراه وبحث متقدم معتمد',
      customSubtitle: 'تحت رعاية الهيئة الأكاديمية الاستشارية العليا لجامعة الملك فهد',
      pageOrientation: 'portrait',
      fontWeight: 'medium',
      borderStyle: 'double',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'gov_policy',
    name: 'مذكرة السياسات والتقارير الحكومية (Policy Brief & Gov)',
    icon: 'fas fa-file-invoice',
    theme: {
      fontFamily: 'Tajawal',
      h1Color: '#112233',
      bodyTextColor: '#1e293b',
      pageBgColor: '#f8fafc',
      accentColor: '#0f766e',
      tableHeaderBg: '#0f766e',
      blockquoteBg: '#f0fdfa',
      baseFontSize: 11.5,
      headingFontSize: 20,
      lineHeight: 1.75,
      pageMargin: 18,
      borderColor: '#2dd4bf',
      bgLight: '#f0fdfa',
      showBorderFrame: true,
      customTitle: 'مذكرة تقدير موقف وسياسات عامة معتمدة',
      customSubtitle: 'تقرير استراتيجي رسمي مجهّز لصالح صناع القرار والجهات التنفيذية العليا',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'tech_whitepaper',
    name: 'الدليل التقني والمستندات الهندسية (Tech Whitepaper & Blueprint)',
    icon: 'fas fa-laptop-code',
    theme: {
      fontFamily: 'Almarai',
      h1Color: '#312e81',
      bodyTextColor: '#0f172a',
      pageBgColor: '#ffffff',
      accentColor: '#4f46e5',
      tableHeaderBg: '#312e81',
      blockquoteBg: '#f5f3ff',
      baseFontSize: 11,
      headingFontSize: 19,
      lineHeight: 1.7,
      pageMargin: 15,
      borderColor: '#818cf8',
      bgLight: '#f5f3ff',
      showBorderFrame: true,
      customTitle: 'دليل البنية التحتية والحلول البرمجية المدعمة',
      customSubtitle: 'وثيقة المواصفات التقنية الفنية المتكاملة للمنظومات والخدمات الإلكترونية',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'royal',
    name: 'الملكي الفاخر (Royal Cream & Gold)',
    icon: 'fas fa-crown',
    theme: {
      fontFamily: 'Amiri',
      h1Color: '#4c1d95',
      bodyTextColor: '#2d0664',
      pageBgColor: '#fdfbf7',
      accentColor: '#b45309',
      tableHeaderBg: '#7c2d12',
      blockquoteBg: '#fffbeb',
      baseFontSize: 12,
      headingFontSize: 21,
      lineHeight: 1.8,
      pageMargin: 18,
      borderColor: '#f59e0b',
      bgLight: '#fffbeb',
      showBorderFrame: false,
      customTitle: 'وثيقة رسمية رفيعة المستوى',
      customSubtitle: 'حررت بالوكالة الذكية في المجمع لتعكس أرقى المقاييس والتقاليد ديوانيًا',
      pageOrientation: 'portrait',
      fontWeight: 'medium',
      borderStyle: 'double',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'creative',
    name: 'الإبداعي الحديث (Creative Coral)',
    icon: 'fas fa-magic',
    theme: {
      fontFamily: 'Cairo',
      h1Color: '#db2777',
      bodyTextColor: '#4c0519',
      pageBgColor: '#fdfafb',
      accentColor: '#f43f5e',
      tableHeaderBg: '#be185d',
      blockquoteBg: '#fff1f2',
      baseFontSize: 10.5,
      headingFontSize: 19.5,
      lineHeight: 1.65,
      pageMargin: 14,
      borderColor: '#fda4af',
      bgLight: '#fff1f2',
      showBorderFrame: true,
      customTitle: 'مذكرة إبداعية أنيقة وجميلة',
      customSubtitle: 'مصممة خصيصاً بتنسيق فني ومقاطع ملونة ملهمة',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'dashed',
      columnCount: 1,
      textAlignment: 'right'
    }
  },
  {
    id: 'nebula',
    name: 'الصحافة العصرية عمودين (Modern Gazette)',
    icon: 'fas fa-newspaper',
    theme: {
      fontFamily: 'Cairo',
      h1Color: '#1e1b4b',
      bodyTextColor: '#1f2937',
      pageBgColor: '#fcfdfe',
      accentColor: '#3b82f6',
      tableHeaderBg: '#1d4ed8',
      blockquoteBg: '#eff6ff',
      baseFontSize: 11,
      headingFontSize: 18.5,
      lineHeight: 1.7,
      pageMargin: 14,
      borderColor: '#93c5fd',
      bgLight: '#eff6ff',
      showBorderFrame: true,
      customTitle: 'النشرة الصحفية المنسقة والجاهزة للطباعة',
      customSubtitle: 'توزيع وتخطيط متوازن على عمودين متوازيين بلمسات فنية أنيقة',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 2,
      textAlignment: 'justify'
    }
  },
  {
    id: 'emerald',
    name: 'الزمردي المؤسسي (Luxury Emerald)',
    icon: 'fas fa-gem',
    theme: {
      fontFamily: 'Almarai',
      h1Color: '#064e3b',
      bodyTextColor: '#022c22',
      pageBgColor: '#fafdfb',
      accentColor: '#10b981',
      tableHeaderBg: '#0f766e',
      blockquoteBg: '#f0fdf4',
      baseFontSize: 11,
      headingFontSize: 18.5,
      lineHeight: 1.75,
      pageMargin: 15,
      borderColor: '#6ee7b7',
      bgLight: '#f0fdf4',
      showBorderFrame: true,
      customTitle: 'مستند زمردي ذهبي رسمي',
      customSubtitle: 'منسق بنمط الألوان الهادئة والهوامش الملكية الفخمة',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'double',
      columnCount: 1,
      textAlignment: 'justify'
    }
  },
  {
    id: 'minimalist',
    name: 'الحداثة البسيطة (Zen Minimalist)',
    icon: 'fas fa-feather',
    theme: {
      fontFamily: 'Almarai',
      h1Color: '#111827',
      bodyTextColor: '#374151',
      pageBgColor: '#ffffff',
      accentColor: '#9ca3af',
      tableHeaderBg: '#1f2937',
      blockquoteBg: '#f9fafb',
      baseFontSize: 11.5,
      headingFontSize: 17,
      lineHeight: 1.8,
      pageMargin: 20,
      borderColor: '#e5e7eb',
      bgLight: '#f9fafb',
      showBorderFrame: false,
      customTitle: 'مستند بسيط للغاية فائق الترويق',
      customSubtitle: 'يركز على المساحات البيضاء المريحة والخطوط الحديثة دون تعقيد بصري',
      pageOrientation: 'portrait',
      fontWeight: 'normal',
      borderStyle: 'solid',
      columnCount: 1,
      textAlignment: 'right'
    }
  }
];

export const WordEditModal: React.FC<WordEditModalProps> = ({ 
  isOpen, 
  onClose, 
  initialContent, 
  initialStyle = 'standard' 
}) => {
  // Master document content states
  const [markdownContent, setMarkdownContent] = useState('');
  const [customHtmlBody, setCustomHtmlBody] = useState('');
  const [fileName, setFileName] = useState('');

  const [activeTab, setActiveTab] = useState<'preview' | 'editor'>('preview');
  const [showCustomizer, setShowCustomizer] = useState(true);
  const [showAdvancedStyles, setShowAdvancedStyles] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(0.75);

  // Auto-fit zoom on mount and resize
  useEffect(() => {
    if (isOpen) {
      const handleResize = () => {
        const container = document.getElementById('word-preview-scroll-container');
        if (container) {
          const containerWidth = container.clientWidth - 48; // padding
          const a4WidthMm = 210;
          const a4WidthPx = a4WidthMm * 3.78; // approx px in mm
          let fitZoom = containerWidth / a4WidthPx;
          
          // Clamp fitZoom to reasonable values - default to at least 0.75 as per user request
          fitZoom = Math.min(Math.max(0.75, fitZoom), 1.1);
          setZoom(parseFloat(fitZoom.toFixed(2)));
        }
      };

      // Slight delay to ensure container is rendered
      const timeoutId = setTimeout(handleResize, 100);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timeoutId);
      };
    }
  }, [isOpen]);

  // Stylings States
  const [currentThemeId, setCurrentThemeId] = useState<string>(initialStyle);
  const [fontFamily, setFontFamily] = useState<string>('Tajawal');
  const [baseFontSize, setBaseFontSize] = useState<number>(11.5);
  const [headingFontSize, setHeadingFontSize] = useState<number>(18.5);
  const [lineHeight, setLineHeight] = useState<number>(1.75);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(8);
  const [pageMargin, setPageMargin] = useState<number>(16);

  const [h1Color, setH1Color] = useState<string>('#1e3a8a');
  const [bodyTextColor, setBodyTextColor] = useState<string>('#1e293b');
  const [pageBgColor, setPageBgColor] = useState<string>('#ffffff');
  const [accentColor, setAccentColor] = useState<string>('#3b82f6');
  const [tableHeaderBg, setTableHeaderBg] = useState<string>('#1e3a8a');
  const [blockquoteBg, setBlockquoteBg] = useState<string>('#f8fafc');

  const [showBorderFrame, setShowBorderFrame] = useState<boolean>(false);
  const [borderStyle, setBorderStyle] = useState<string>('double');
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const [customFooterText, setCustomFooterText] = useState<string>('تم تنسيقه باحترافية عبر المنصة المتكاملة');

  const [customTitle, setCustomTitle] = useState<string>('البحث العلمي المحكم المنسق');
  const [customSubtitle, setCustomSubtitle] = useState<string>('تقرير بحثي مجهز بالكامل للتصدير الفوري للورد');

  // Cover Page States
  const [showCoverPage, setShowCoverPage] = useState<boolean>(false);
  const [showAppendixImages, setShowAppendixImages] = useState<boolean>(false);
  const [coverUniversity, setCoverUniversity] = useState<string>('جامعة العلوم والتقنية');
  const [coverFaculty, setCoverFaculty] = useState<string>('كلية علوم الحاسب والذكاء الاصطناعي');
  const [coverDepartment, setCoverDepartment] = useState<string>('قسم هندسة البرمجيات');
  const [coverTitle, setCoverTitle] = useState<string>('');
  const [coverSubtitle, setCoverSubtitle] = useState<string>('');
  const [coverDoctor, setCoverDoctor] = useState<string>('أ.د. المتميز الفاضل');
  const [coverStudent, setCoverStudent] = useState<string>('الباحث المتفوق المبتكر');
  const [coverStudentId, setCoverStudentId] = useState<string>('2026/10450');
  const [coverCourse, setCoverCourse] = useState<string>('منهجية العلوم والتأطير التقني');
  const [coverYear, setCoverYear] = useState<string>('٢٠٢٦ م / ١٤٤٧ هـ');

  const [coverLayout, setCoverLayout] = useState<'center' | 'classic' | 'striped' | 'formal' | 'minimalist'>('center');
  const [coverLogoType, setCoverLogoType] = useState<'crest' | 'grad' | 'atom' | 'book' | 'none'>('crest');
  const [coverDivider, setCoverDivider] = useState<'none' | 'thin' | 'double' | 'fancy'>('thin');

  const [activeSetupTab, setActiveSetupTab] = useState<'content' | 'presets' | 'typography' | 'colors' | 'layout' | 'cover' | 'images'>('content');

  // Image & Media customizer states
  const [imgSearchQuery, setImgSearchQuery] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imgCustomUrl, setImgCustomUrl] = useState<string>('');
  const [imgAltInput, setImgAltInput] = useState<string>('');
  const [extImgInsertUrl, setExtImgInsertUrl] = useState<string>('');
  const [extImgInsertAlt, setExtImgInsertAlt] = useState<string>('');
  const [mediaActiveCategory, setMediaActiveCategory] = useState<string>('science');
  const [imgInsertPosition, setImgInsertPosition] = useState<string>('end');

  const availableHeadings = useMemo(() => {
    const headings = markdownContent.match(/^(#{1,3})\s+(.+)$/gm) || [];
    return headings.map(h => ({
      full: h,
      text: h.replace(/^(#{1,3})\s+/, '')
    }));
  }, [markdownContent]);

  // Ref container for live editings inside preview
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // Font options
  const arabicFonts = [
    { id: 'Tajawal', name: 'خط تجول (عصري)' },
    { id: 'Cairo', name: 'خط كيرو (رسمي وجريء)' },
    { id: 'Amiri', name: 'خط أميري (أكاديمي/أثري)' },
    { id: 'Almarai', name: 'خط المراعي (سلس ومقروء)' },
    { id: 'Lemonada', name: 'خط ليمونادة (إبداعي فني)' }
  ];

  // Apply predefined preset values
  const applyPreset = (presetId: string) => {
    const found = STYLE_PRESETS.find(p => p.id === presetId);
    if (found) {
      setCurrentThemeId(presetId);
      setFontFamily(found.theme.fontFamily);
      setH1Color(found.theme.h1Color);
      setBodyTextColor(found.theme.bodyTextColor);
      setPageBgColor(found.theme.pageBgColor);
      setAccentColor(found.theme.accentColor);
      setTableHeaderBg(found.theme.tableHeaderBg);
      setBlockquoteBg(found.theme.blockquoteBg);
      setBaseFontSize(found.theme.baseFontSize);
      setHeadingFontSize(found.theme.headingFontSize);
      setLineHeight(found.theme.lineHeight);
      setPageMargin(found.theme.pageMargin);
      setShowBorderFrame(found.theme.showBorderFrame);
      setBorderStyle(found.theme.borderStyle);

      if (found.theme.customTitle) setCustomTitle(found.theme.customTitle);
      if (found.theme.customSubtitle) setCustomSubtitle(found.theme.customSubtitle);
    }
  };

  // Helper functions for advanced image editing, replacement, and insertion in the Word Doc
  const handleReplaceImageUrl = (oldUrl: string, newUrl: string, oldAlt: string, newAlt: string) => {
    if (!oldUrl) return;
    
    // Escape specific regex characters in order to safely target the markdown
    const escapedOldUrl = oldUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedOldAlt = oldAlt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`!\\[${escapedOldAlt}\\]\\(${escapedOldUrl}\\)`, 'g');
    
    const updatedMarkdown = markdownContent.replace(regex, `![${newAlt}](${newUrl})`);
    setMarkdownContent(updatedMarkdown);
    
    // Regenerate and update compiled HTML
    const compiled = markdownToWordPreviewHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    setSelectedImageIndex(null);
  };

  const handleDeleteImage = (url: string, alt: string) => {
    const escapedOldUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedOldAlt = alt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`!\\[${escapedOldAlt}\\]\\(${escapedOldUrl}\\)`, 'g');
    
    const updatedMarkdown = markdownContent.replace(regex, '');
    setMarkdownContent(updatedMarkdown);
    
    const compiled = markdownToWordPreviewHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    setSelectedImageIndex(null);
  };

  const handleInsertImage = (url: string, alt: string) => {
    if (!url) return;
    const cleanAlt = alt || 'صورة توضيحية علمية';
    const newImageMarkdown = `\n\n![${cleanAlt}](${url})\n\n`;
    
    let updatedMarkdown = markdownContent;

    if (imgInsertPosition === 'end') {
      updatedMarkdown = markdownContent + newImageMarkdown;
    } else if (imgInsertPosition === 'start') {
      const matched = markdownContent.match(/^(#\s+.+)$/m);
      if (matched) {
         updatedMarkdown = markdownContent.replace(matched[1], matched[1] + newImageMarkdown);
      } else {
         updatedMarkdown = newImageMarkdown + markdownContent;
      }
    } else {
      // Handle inserting after a specific heading safely
      const escapedHeading = imgInsertPosition.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`^(${escapedHeading})$`, 'm');
      if (regex.test(markdownContent)) {
        updatedMarkdown = markdownContent.replace(regex, `$1${newImageMarkdown}`);
      } else {
        updatedMarkdown = markdownContent + newImageMarkdown; // Fallback
      }
    }

    setMarkdownContent(updatedMarkdown);
    
    const compiled = markdownToWordPreviewHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    
    // Clear custom url states
    setImgCustomUrl('');
    setImgAltInput('');
  };

  // Load and parse initial content
  useEffect(() => {
    if (isOpen) {
      setMarkdownContent(initialContent || '');
      const compiled = markdownToWordPreviewHtml(initialContent || '');
      setCustomHtmlBody(compiled);
      setFileName(`مستند_معدل_${Date.now()}`);
      applyPreset(initialStyle);

      // Auto-extract and populate Cover Meta
      if (initialContent) {
        const lines = initialContent.split('\n');
        const h1Line = lines.find(l => l.trim().startsWith('# '));
        let titleVal = '';
        if (h1Line) {
          titleVal = h1Line.replace(/^#\s+/, '').trim().replace(/\*\*+/g, '').replace(/__+/g, '');
        }

        if (titleVal) {
          setCoverTitle(titleVal);
          setCustomTitle(titleVal);

          const biologyTerms = ['تكاثر', 'أحياء', 'بيولوج', 'asexual', 'biology'];
          const lowerTxt = (initialContent + ' ' + titleVal).toLowerCase();
          const isBio = biologyTerms.some(term => lowerTxt.includes(term));

          if (isBio) {
            setCoverUniversity('جامعة العلوم التطبيقية');
            setCoverFaculty('كلية العلوم الطبيعية');
            setCoverDepartment('قسم الأحياء');
            setCoverCourse('علم الأحياء والدراسات الحية');
            setCoverSubtitle('أطروحة بحثية مخصصة استكمالاً لمتطلبات لجان التدقيق بوزارة التعليم العالي');
          } else {
            setCoverUniversity('جامعة العلوم والتقنية الحديثة');
            setCoverFaculty('كلية الدراسات التخصصية العليا');
            setCoverDepartment('لجنة التطوير الهندسي والبحث العلمي');
            setCoverCourse(`مقرر دراسات ${titleVal.substring(0, 25)}`);
            setCoverSubtitle('دليل تحليلي وبحث متخصص ومراجع بالكامل بأعلى المعايير الأكاديمية');
          }
        } else {
          setCoverTitle('البحث العلمي المحكم المنسق والمدقق');
          setCoverSubtitle('دليل تحليلي شامل لمتطلبات اللجان الأكاديمية وصياغة المعايير وتأهيل الطلاب');
        }
      }
    }
  }, [isOpen, initialContent, initialStyle]);

  // Sync markdown changes inside text tab
  const handleMarkdownTextTabChange = (val: string) => {
    setMarkdownContent(val);
    const compiled = markdownToWordPreviewHtml(val);
    setCustomHtmlBody(compiled);
  };

  // Sync live direct editable div
  const handleDirectDivEditInput = (e: React.FormEvent<HTMLDivElement>) => {
    const updatedHtml = e.currentTarget.innerHTML;
    // Keep internal refs or update state occasionally
    // For smooth editing, we let the div manage typing, but save changes before processing
  };

  const fetchImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch (e) {
      console.error("Error fetching image buffer:", e);
      return null;
    }
  };

  // Convert current markdown and metadata into a highly professional docx
  const triggerDocxDownload = async () => {
    try {
      setIsDownloading(true);
      const activeText = contentEditableRef.current?.innerText || markdownContent;
      
      // Parse markdown blocks
      const lines = activeText.split('\n');
      const blocks: any[] = [];
      let currentTable: any = null;
      let currentList: any = null;
      let currentQuote: string[] = [];

      const flushQuote = () => {
        if (currentQuote.length > 0) {
          blocks.push({ type: 'quote', content: currentQuote.join('\n') });
          currentQuote = [];
        }
      };
      const flushTable = () => {
        if (currentTable) {
          blocks.push(currentTable);
          currentTable = null;
        }
      };
      const flushList = () => {
        if (currentList) {
          blocks.push(currentList);
          currentList = null;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Safe detection for Markdown Images
        const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/) || line.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          flushTable(); flushList(); flushQuote();
          blocks.push({ type: 'image', alt: imgMatch[1], url: imgMatch[2] });
          continue;
        }

        if (line.startsWith('>')) {
          flushTable(); flushList();
          currentQuote.push(line.substring(1).trim());
          continue;
        } else {
          flushQuote();
        }

        if (line.startsWith('#')) {
          flushTable(); flushList();
          const level = line.match(/^#+/)?.[0].length || 1;
          const text = line.replace(/^#+\s*/, '');
          blocks.push({ type: 'heading', level, text });
          continue;
        }

        if (line.startsWith('|')) {
          flushList();
          const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          const isDivider = cells.every(c => /^:?-+:?$/.test(c));
          
          if (isDivider) continue;

          if (!currentTable) {
            currentTable = { type: 'table', headers: cells, rows: [] };
          } else {
            currentTable.rows.push(cells);
          }
          continue;
        } else {
          flushTable();
        }

        if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
          const isOrdered = /^\d+\.\s/.test(line);
          const content = line.replace(/^(-|\*|\d+\.)\s*/, '');
          
          if (!currentList || currentList.ordered !== isOrdered) {
            flushList();
            currentList = { type: 'list', ordered: isOrdered, items: [content] };
          } else {
            currentList.items.push(content);
          }
          continue;
        } else {
          flushList();
        }

        if (line === '') continue;

        blocks.push({ type: 'paragraph', text: line });
      }
      flushQuote(); flushTable(); flushList();

      const documentChildren: any[] = [];

      // 1. Cover Page Construction
      if (showCoverPage) {
        documentChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: coverUniversity, font: fontFamily, bold: true, size: 28, color: h1Color })
            ],
            spacing: { after: 80 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${coverFaculty} - ${coverDepartment}`, font: fontFamily, size: 20, color: bodyTextColor })
            ],
            spacing: { after: 400 }
          }),
          new Paragraph({ text: '\n\n\n\n\n', spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: coverTitle, font: fontFamily, bold: true, size: 52, color: h1Color })
            ],
            spacing: { after: 240 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: coverSubtitle, font: fontFamily, size: 24, color: accentColor })
            ],
            spacing: { after: 480 }
          }),
          new Paragraph({ text: '\n\n\n\n\n', spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'إعداد الطالب الباحث: ', font: fontFamily, bold: true, size: 22, color: '#475569' }),
              new TextRun({ text: `${coverStudent} (الرقم: ${coverStudentId})`, font: fontFamily, bold: true, size: 22, color: h1Color })
            ],
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'تحت إشراف الأستاذ الدكتور: ', font: fontFamily, bold: true, size: 22, color: '#475569' }),
              new TextRun({ text: coverDoctor, font: fontFamily, bold: true, size: 22, color: h1Color })
            ],
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'المادة والمقرر البحثي: ', font: fontFamily, size: 21, color: '#64748b' }),
              new TextRun({ text: coverCourse, font: fontFamily, size: 21, color: '#1e293b' })
            ],
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'تاريخ التسليم والاعتماد الدراسي: ', font: fontFamily, size: 20, color: '#94a3b8' }),
              new TextRun({ text: coverYear, font: fontFamily, size: 20, color: '#94a3b8' })
            ],
            spacing: { after: 120 }
          }),
          new PageBreak()
        );
      }

      // 2. Body Blocks Insertion
      for (const block of blocks) {
        if (block.type === 'heading') {
          let hLvl: any = HeadingLevel.HEADING_1;
          let fSize = headingFontSize * 2; // docx sizes are half-points
          let spaceBefore = 360;

          if (block.level === 2) {
            hLvl = HeadingLevel.HEADING_2;
            fSize = headingFontSize * 1.6;
            spaceBefore = 240;
          } else if (block.level >= 3) {
            hLvl = HeadingLevel.HEADING_3;
            fSize = headingFontSize * 1.3;
            spaceBefore = 180;
          }

          documentChildren.push(
            new Paragraph({
              heading: hLvl,
              alignment: AlignmentType.RIGHT,
              spacing: { before: spaceBefore, after: 120, line: 360 },
              border: block.level === 1 ? {
                bottom: { color: accentColor, space: 4, size: 12, style: BorderStyle.SINGLE }
              } : undefined,
              children: [
                new TextRun({ text: block.text, font: fontFamily, bold: true, size: fSize, color: h1Color })
              ]
            })
          );
        }

        else if (block.type === 'image') {
          const imgBuffer = await fetchImageAsArrayBuffer(block.url);
          if (imgBuffer) {
            documentChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 180, after: 120 },
                children: [
                  new ImageRun({
                    data: imgBuffer,
                    transformation: {
                      width: 450,
                      height: 300
                    }
                  } as any)
                ]
              })
            );

            if (block.alt) {
              documentChildren.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 180 },
                  children: [
                    new TextRun({
                      text: block.alt,
                      font: fontFamily,
                      size: 18,
                      color: '#475569',
                      italics: true
                    })
                  ]
                })
              );
            }
          } else {
            // Safe fallback
            documentChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
                children: [
                  new TextRun({
                    text: `[الصورة: ${block.alt || 'بلا عنوان'}]`,
                    font: fontFamily,
                    bold: true,
                    size: 20,
                    color: '#94a3b8'
                  })
                ]
              })
            );
          }
        }

        else if (block.type === 'paragraph') {
          const inlineSegs = parseInlineMarkdown(block.text);
          const runs = inlineSegs.map(seg => (
            new TextRun({
              text: seg.text,
              font: fontFamily,
              bold: seg.bold,
              italics: seg.italic,
              size: baseFontSize * 2,
              color: bodyTextColor
            })
          ));

          documentChildren.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 100, after: paragraphSpacing * 20, line: lineHeight * 240 },
              children: runs
            })
          );
        }

        else if (block.type === 'quote') {
          documentChildren.push(
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 180, after: 180, line: 280 },
              border: {
                right: { color: accentColor, space: 12, size: 24, style: BorderStyle.SINGLE }
              },
              children: [
                new TextRun({
                  text: block.content,
                  font: fontFamily,
                  italics: true,
                  size: (baseFontSize - 0.5) * 2,
                  color: '#475569'
                })
              ]
            })
          );
        }

        else if (block.type === 'list') {
          block.items.forEach((item: string) => {
            documentChildren.push(
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 80, after: 80 },
                bullet: block.ordered ? undefined : { level: 0 },
                children: [
                  new TextRun({
                    text: block.ordered ? `• ${item}` : item,
                    font: fontFamily,
                    size: baseFontSize * 2,
                    color: bodyTextColor
                  })
                ]
              })
            );
          });
        }

        else if (block.type === 'table') {
          const headerRowCells = block.headers.map((h: string) => (
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: h, font: fontFamily, bold: true, size: 21, color: '#ffffff' })
                  ]
                })
              ],
              shading: { fill: tableHeaderBg }
            })
          ));

          const dataRows = block.rows.map((rowArr: string[], rIdx: number) => (
            new TableRow({
              children: rowArr.map((cellText: string) => (
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({ text: cellText, font: fontFamily, size: 19, color: bodyTextColor })
                      ]
                    })
                  ],
                  shading: { fill: rIdx % 2 === 0 ? blockquoteBg : '#ffffff' }
                })
              ))
            })
          ));

          documentChildren.push(
            new Table({
              rows: [
                new TableRow({ children: headerRowCells }),
                ...dataRows
              ],
              width: { size: 100, type: WidthType.PERCENTAGE }
            }),
            new Paragraph({ text: '', spacing: { before: 180 } })
          );
        }
      }

      // 5. Final Appendix Image Gallery Page (Only if enabled)
      const imagesFound = blocks.filter(b => b.type === 'image');
      if (showAppendixImages && imagesFound.length > 0) {
        documentChildren.push(new Paragraph({ children: [new PageBreak()] }));
        documentChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ملحق الصور والأشكال والمخططات', font: fontFamily, bold: true, size: 42, color: h1Color })
            ],
            spacing: { before: 400, after: 600 }
          })
        );

        // Process images with captions in appendix
        for (let idx = 0; idx < imagesFound.length; idx++) {
          const img = imagesFound[idx];
          const imgBuffer = await fetchImageAsArrayBuffer(img.url);
          if (imgBuffer) {
             documentChildren.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new ImageRun({
                            data: imgBuffer,
                            transformation: { width: 450, height: 300 }
                        } as any)
                    ],
                    spacing: { before: 200, after: 100 }
                })
             );
          }
          documentChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `شكل (${idx + 1}): ${img.alt || 'صورة توضيحية'}`, font: fontFamily, size: 21, color: bodyTextColor, bold: true })
              ],
              spacing: { before: 200, after: 400 }
            })
          );
        }
      }

      // Assemble into document with layout properties
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: pageMargin * 56.7,
                bottom: pageMargin * 56.7,
                left: pageMargin * 56.7,
                right: pageMargin * 56.7
              }
            }
          },
          headers: showHeader ? {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  border: { bottom: { color: accentColor, space: 4, size: 6, style: BorderStyle.SINGLE } },
                  spacing: { after: 120 },
                  children: [
                    new TextRun({ text: customTitle, font: fontFamily, size: 18, color: '#64748b' })
                  ]
                })
              ]
            })
          } : undefined,
          footers: showFooter ? {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { color: '#cbd5e1', space: 4, size: 6, style: BorderStyle.SINGLE } },
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: `${customFooterText} | صفحة `, font: fontFamily, size: 18, color: '#94a3b8' }),
                    new TextRun({ children: [PageNumber.CURRENT], font: fontFamily, size: 18, color: '#94a3b8' })
                  ]
                })
              ]
            })
          } : undefined,
          children: documentChildren
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${fileName}.docx`);
      onClose();
    } catch (err) {
      console.error(err);
      alert('فشل في تصدير ملف DOCX المخصص، يرجى مراجعة الصياغة والتنسيقات.');
    } finally {
      setIsDownloading(false);
    }
  };

  const dynamicCss = `
    .word-preview-page {
      font-family: '${fontFamily}', 'Tajawal', sans-serif !important;
      color: ${bodyTextColor} !important;
      background-color: ${pageBgColor} !important;
      padding: ${pageMargin}mm !important;
      box-sizing: border-box !important;
      min-height: 297mm !important;
      position: relative !important;
      direction: rtl !important;
      text-align: ${textAlignmentRule(fontFamily)} !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
      ${showBorderFrame ? `border: 4.5px ${borderStyle} ${accentColor} !important; border-radius: 4px !important;` : 'border: 1px solid #cbd5e1 !important;'}
    }
    
    .word-preview-page h1 {
      font-family: '${fontFamily}', sans-serif !important;
      font-size: ${headingFontSize}pt !important;
      font-weight: 800 !important;
      color: ${h1Color} !important;
      margin-top: 24pt !important; 
      margin-bottom: 12pt !important;
      border-bottom: 2.5px solid ${accentColor} !important;
      padding-bottom: 8px !important;
      line-height: 1.4 !important;
      text-align: right !important;
    }
    
    .word-preview-page h2 {
      font-family: '${fontFamily}', sans-serif !important;
      font-size: ${(headingFontSize * 0.82).toFixed(1)}pt !important;
      font-weight: 700 !important;
      color: ${h1Color} !important;
      margin-top: 18pt !important; 
      margin-bottom: 10pt !important;
      border-bottom: 1px dashed ${accentColor}80 !important;
      padding-bottom: 6px !important;
      line-height: 1.35 !important;
      text-align: right !important;
    }
    
    .word-preview-page h3 {
      font-family: '${fontFamily}', sans-serif !important;
      font-size: ${(headingFontSize * 0.72).toFixed(1)}pt !important;
      font-weight: 700 !important;
      color: ${h1Color} !important;
      margin-top: 14pt !important; 
      margin-bottom: 8pt !important;
      text-align: right !important;
    }

    .word-preview-page h4 {
      font-family: '${fontFamily}', sans-serif !important;
      color: ${h1Color} !important;
      text-align: right !important;
      font-weight: bold !important;
    }
    
    .word-preview-page p, .word-preview-page .doc-paragraph {
      font-size: ${baseFontSize}pt !important;
      line-height: ${lineHeight} !important;
      margin-bottom: ${paragraphSpacing}pt !important;
      color: ${bodyTextColor} !important;
      text-align: justify !important;
    }
    
    .word-preview-page blockquote {
      border-right: 4.5px solid ${accentColor} !important;
      padding: 10px 16px !important;
      margin: 18pt 0 !important;
      background-color: ${blockquoteBg} !important;
      font-style: italic !important;
      color: ${bodyTextColor}cc !important;
      font-size: ${(baseFontSize - 0.5)}pt !important;
      border-radius: 0 6px 6px 0 !important;
      text-align: right !important;
    }
    
    .word-preview-page ul, .word-preview-page ol {
      margin-bottom: 12pt !important;
      padding-right: 24px !important;
      text-align: right !important;
    }
    
    .word-preview-page ul {
      list-style-type: disc !important;
    }
    
    .word-preview-page ol {
      list-style-type: decimal !important;
    }
    
    .word-preview-page li {
      font-size: ${baseFontSize}pt !important;
      line-height: ${lineHeight} !important;
      margin-bottom: 5pt !important;
      color: ${bodyTextColor} !important;
    }
    
    .word-preview-page table.preview-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 18pt 0 !important;
      direction: rtl !important;
    }
    
    .word-preview-page table.preview-table th {
      background-color: ${tableHeaderBg} !important;
      color: #ffffff !important;
      font-weight: bold !important;
      font-size: ${baseFontSize}pt !important;
      padding: 10px 14px !important;
      border: 1px solid ${accentColor}30 !important;
      text-align: right !important;
    }
    
    .word-preview-page table.preview-table td {
      padding: 9px 14px !important;
      font-size: ${(baseFontSize - 0.5)}pt !important;
      border: 1px solid #cbd5e160 !important;
      text-align: right !important;
    }
    
    .word-preview-page table.preview-table tr.row-even {
      background-color: ${blockquoteBg} !important;
    }
    .word-preview-page table.preview-table tr.row-odd {
      background-color: #ffffff !important;
    }
  `;

  function textAlignmentRule(font: string) {
    return 'justify';
  }

  // Cover Page layout elements styling generator
  const renderCoverPagePreview = () => {
    const isPortrait = true;
    const bodyClr = bodyTextColor;
    const universityLogoSvg = () => {
      if (coverLogoType === 'crest') {
        return (
          <svg className="w-14 h-14 mx-auto mb-3" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 4L8 14V26C8 38.8 17.6 50.8 32 56C46.4 50.8 56 38.8 56 26V14L32 4Z" stroke={h1Color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill={`${accentColor}10`}/>
            <path d="M32 15V45" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 28H42" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="32" cy="28" r="6" stroke={h1Color} strokeWidth="2" fill="#ffffff" />
          </svg>
        );
      }
      if (coverLogoType === 'grad') {
        return (
          <svg className="w-14 h-14 mx-auto mb-3" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 8L4 20L32 32L60 20L32 8Z" fill={`${accentColor}20`} stroke={h1Color} strokeWidth="3" strokeLinejoin="round"/>
            <path d="M12 25.5V41C12 45.4 20.9 49 32 49C43.1 49 52 45.4 52 41V25.5" stroke={h1Color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M54 21V38" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="54" cy="39" r="3.5" fill={accentColor}/>
          </svg>
        );
      }
      if (coverLogoType === 'atom') {
        return (
          <svg className="w-14 h-14 mx-auto mb-3" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="32" cy="32" rx="28" ry="9" stroke={h1Color} strokeWidth="2" transform="rotate(30 32 32)" />
            <ellipse cx="32" cy="32" rx="28" ry="9" stroke={h1Color} strokeWidth="2" transform="rotate(-30 32 32)" />
            <ellipse cx="32" cy="32" rx="28" ry="9" stroke={accentColor} strokeWidth="2" transform="rotate(90 32 32)" />
            <circle cx="32" cy="32" r="5" fill={accentColor} stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        );
      }
      if (coverLogoType === 'book') {
        return (
          <svg className="w-14 h-14 mx-auto mb-3" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 52V12C8 9.8 9.8 8 12 8H52V52H12C9.8 52 8 50.2 8 48Z" stroke={h1Color} strokeWidth="3" fill={`${accentColor}10`}/>
            <path d="M16 16H42" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 26H42" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 36H32" stroke={accentColor} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      }
      return null;
    };

    const separatorLine = () => {
      if (coverDivider === 'thin') {
        return <div className="w-40 h-[1.5px] mx-auto my-7 opacity-80" style={{ backgroundColor: accentColor }}></div>;
      }
      if (coverDivider === 'double') {
        return (
          <div className="my-7 flex flex-col gap-1 items-center justify-center">
            <div className="w-48 h-[2px]" style={{ backgroundColor: h1Color }}></div>
            <div className="w-48 h-[1px] opacity-70" style={{ backgroundColor: accentColor }}></div>
          </div>
        );
      }
      if (coverDivider === 'fancy') {
        return (
          <div className="my-7 flex items-center justify-center gap-2.5">
            <div className="w-16 h-[1px] bg-slate-250"></div>
            <span className="text-[10px]" style={{ color: h1Color }}>⬥ ⬥ ✦ ⬥ ⬥</span>
            <div className="w-16 h-[1px] bg-slate-250"></div>
          </div>
        );
      }
      return <div className="h-6"></div>;
    };

    if (coverLayout === 'classic') {
      return (
        <div className="w-full h-full flex flex-col justify-between text-right p-10 bg-white relative border-4 border-double" style={{ borderColor: h1Color }}>
          <div className="absolute top-3 right-3 text-sm select-none" style={{ color: accentColor }}>⚜</div>
          <div className="absolute top-3 left-3 text-sm select-none" style={{ color: accentColor }}>⚜</div>
          <div className="absolute bottom-3 right-3 text-sm select-none" style={{ color: accentColor }}>⚜</div>
          <div className="absolute bottom-3 left-3 text-sm select-none" style={{ color: accentColor }}>⚜</div>

          <div className="flex justify-between items-start border-b border-slate-150 pb-3">
            <div>
              <span className="block text-xs font-black" style={{ color: h1Color }}>{coverUniversity}</span>
              <span className="block text-[9px] text-slate-500 mt-1 font-bold">{coverFaculty}</span>
            </div>
            <div>{universityLogoSvg()}</div>
            <div className="text-left">
              <span className="block text-[9px] text-slate-400">تاريخ التقديم</span>
              <span className="text-xs font-bold" style={{ color: h1Color }}>{coverYear}</span>
            </div>
          </div>

          <div className="my-auto text-center border border-slate-150/80 bg-slate-50/50 p-6 rounded-xl">
            <h1 className="text-2.5xl font-black leading-snug" style={{ color: h1Color }}>{coverTitle}</h1>
            {separatorLine()}
            <p className="text-xs text-slate-500 leading-relaxed max-w-lg mx-auto font-medium">{coverSubtitle}</p>
          </div>

          <div className="text-center font-bold text-[10px] tracking-wider mb-2" style={{ color: accentColor }}>
            ❆ التقرير الأكاديمي والبحث الجامعي الموقر ❆
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-[9px] text-slate-400 font-bold">إعداد الطالب الباحث:</p>
              <strong className="text-xs font-black block" style={{ color: h1Color }}>{coverStudent}</strong>
              <span className="text-[9.5px] font-mono text-slate-500">الرقم: {coverStudentId}</span>
            </div>
            <div className="space-y-1 text-left">
              <p className="text-[9px] text-slate-400 font-bold">بإشراف الدكتور الموقر:</p>
              <strong className="text-xs font-black block text-slate-700">{coverDoctor}</strong>
              <span className="text-[9.5px] text-slate-400">المشرف الأكاديمي</span>
            </div>
          </div>
        </div>
      );
    }

    if (coverLayout === 'striped') {
      return (
        <div className="w-full h-full flex flex-col justify-between text-right font-sans relative overflow-hidden p-8 border border-slate-200">
          <div className="absolute top-0 right-0 w-3.5 h-full" style={{ backgroundColor: h1Color }}></div>
          <div className="absolute top-0 right-3.5 w-1.5 h-full opacity-60" style={{ backgroundColor: accentColor }}></div>
          
          <div className="pr-8 pt-6">
            <span className="block text-xs font-black" style={{ color: h1Color }}>{coverUniversity}</span>
            <span className="block text-[10px] text-slate-500 mt-1 font-medium">{coverFaculty} • {coverDepartment}</span>
          </div>

          <div className="pr-8 my-auto max-w-[85%]">
            <h1 className="text-3xl font-black leading-snug" style={{ color: h1Color }}>{coverTitle}</h1>
            <p className="text-xs text-slate-650 mt-4 leading-relaxed border-r-4 pr-3" style={{ borderRightColor: accentColor }}>{coverSubtitle}</p>
          </div>

          <div className="pr-8 pb-6 flex justify-between items-end border-t border-slate-100 pt-6">
            <div className="space-y-1">
              <p className="text-[9px] text-slate-400 font-bold">بإعداد ومجهود الباحث</p>
              <p className="text-xs font-black" style={{ color: h1Color }}>{coverStudent}</p>
              <p className="text-[9.5px] font-mono text-slate-500 font-bold">الرقم: {coverStudentId}</p>
            </div>
            
            <div className="space-y-1 text-left">
              <p className="text-[9px] text-slate-400 font-bold">تحت إشراف الأستاذ</p>
              <p className="text-xs font-black text-slate-700">{coverDoctor}</p>
              <p className="text-[9.5px] text-slate-500">{coverYear}</p>
            </div>
          </div>
        </div>
      );
    }

    if (coverLayout === 'formal') {
      return (
        <div className="w-full h-full flex flex-col justify-between text-right p-12 bg-white relative">
          <div className="absolute inset-8 border border-slate-350 pointer-events-none"></div>
          <div className="absolute inset-9 border-2 border-double pointer-events-none" style={{ borderColor: `${h1Color}30` }}></div>

          <div className="z-10 flex justify-between items-start">
            <div className="text-right">
              <span className="block text-[11px] font-black" style={{ color: h1Color }}>{coverUniversity}</span>
              <span className="block text-[9.5px] text-slate-500 font-bold mt-1">{coverFaculty}</span>
              <span className="block text-[8.5px] text-slate-450 mt-0.5">{coverDepartment}</span>
            </div>
            <div className="text-left shrink-0">{universityLogoSvg()}</div>
          </div>

          <div className="my-auto z-10 text-center px-6">
            <h1 className="text-2xl sm:text-3.5xl font-black leading-snug tracking-tight" style={{ color: h1Color }}>{coverTitle}</h1>
            {separatorLine()}
            <p className="text-xs text-slate-550 leading-relaxed max-w-lg mx-auto font-medium">{coverSubtitle}</p>
          </div>

          <div className="z-10 border-t border-slate-200 pt-6 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 text-right">
              <p className="text-[10px] text-slate-400 font-black">تفاصيل مقدم الخدمة والبحث:</p>
              <p className="font-extrabold text-[#070b16]">{coverStudent}</p>
              <p className="text-[10px] font-mono font-bold text-slate-500">الرقم الدراسي: {coverStudentId}</p>
            </div>
            <div className="space-y-2 text-left">
              <p className="text-[10px] text-slate-450 font-black">لجنة الجودة والتدقيق العلمي:</p>
              <p className="font-extrabold text-slate-850">أ.د. {coverDoctor}</p>
              <p className="text-[9.5px] text-slate-450 font-medium">{coverYear}</p>
            </div>
          </div>
        </div>
      );
    }

    if (coverLayout === 'minimalist') {
      return (
        <div className="w-full h-full flex flex-col justify-between text-right p-12 bg-slate-50">
          <div className="pt-6">
            <span className="block font-mono text-[9px] uppercase tracking-widest text-slate-400 font-bold">{coverUniversity} / {coverFaculty}</span>
          </div>

          <div className="my-auto max-w-xl">
            <span className="inline-block px-2.5 py-0.5 text-[8.5px] font-extrabold bg-slate-900 text-white rounded-full mb-4">مسودة بحثية معتمدة</span>
            <h1 className="text-3.5xl font-black leading-tight text-slate-900 tracking-tight" style={{ fontFamily: 'Cairo, sans-serif' }}>{coverTitle}</h1>
            <div className="w-16 h-[3px] bg-slate-900 my-5"></div>
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{coverSubtitle}</p>
          </div>

          <div className="border-t border-slate-200/60 pt-6 flex justify-between items-center text-slate-550 font-mono text-[9.5px]">
            <div>إعداد: {coverStudent}</div>
            <div>إشراف: أ.د. {coverDoctor}</div>
            <div>{coverYear}</div>
          </div>
        </div>
      );
    }

    // Default 'center' layout
    return (
      <div className="w-full h-full flex flex-col justify-between text-center p-12 bg-white relative">
        <div className="absolute inset-5 border border-slate-200/50"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[220px] bg-slate-50/40 pointer-events-none"></div>

        <div className="z-10 pt-4">
          {universityLogoSvg()}
          <span className="block text-xs font-black mt-2" style={{ color: h1Color }}>{coverUniversity}</span>
          <span className="block text-[10px] text-slate-550 mt-1 font-bold">{coverFaculty} / {coverDepartment}</span>
        </div>

        <div className="my-auto z-10 px-4">
          <p className="text-[9px] font-extrabold tracking-widest text-slate-400 mb-2">أطروحة بحثية معتمدة لنوع مستندات Word</p>
          <h1 className="text-2.5xl sm:text-3xl font-black leading-snug" style={{ color: h1Color }}>{coverTitle}</h1>
          <div className="w-20 h-1 bg-indigo-600 mx-auto my-5 rounded-full" style={{ backgroundColor: accentColor }}></div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">{coverSubtitle}</p>
        </div>

        <div className="z-10 border-t border-slate-100 pt-5 flex items-center justify-between text-right text-xs">
          <div>
            <span className="block text-[9px] text-slate-400 font-bold">بإشراف المشرف</span>
            <span className="font-extrabold text-slate-750">{coverDoctor}</span>
          </div>
          <div className="text-center">
            <span className="block text-[9px] text-slate-400 font-bold">المعد الرئيسي</span>
            <span className="font-extrabold text-[#05070e]">{coverStudent}</span>
          </div>
          <div className="text-left">
            <span className="block text-[9px] text-slate-400 font-bold">التاريخ الدراسي</span>
            <span className="font-medium text-slate-500">{coverYear}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#01040f]/95 backdrop-blur-md animate-in fade-in duration-200 p-0 md:p-4 text-right" dir="rtl">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-7xl h-[100vh] md:h-[95vh] md:rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
        
        {/* Style configurations element loader */}
        <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1e293b]/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center border border-indigo-400/20 shadow-lg shadow-indigo-500/10">
              <i className="fas fa-file-word text-white text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-base md:text-lg font-sans">معالج ومصمّم مستندات MS Word الاحترافي</h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">تحديث فوري</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">خصص صفحة الغلاف والخطوط والألوان بدقة بالغة، ثم صدّر مستند DOCX حقيقي متوافق بالكامل مع مايكروسوفت وورد!</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/5"
            title="إغلاق التوليد"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Dynamic Buttons Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#141d2f] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveSetupTab('content');
                setShowAdvancedStyles(true);
              }}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[11px] md:text-xs shadow-lg shadow-indigo-650/10 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer relative group overflow-hidden"
              style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              title="انقر لتعديل المحتوى النصي، تغيير الخطوط والألوان في لوحة واحدة"
            >
              <i className="fas fa-sliders-h text-sm"></i>
              <span>لوحة التنسيق والتحكم الشامل 🎨⚙️</span>
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-[#101726] border border-white/5 rounded-xl p-1.5 shadow-inner shrink-0 text-slate-300">
              <button 
                onClick={() => setZoom(Math.max(0.4, zoom - 0.05))}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer text-xs transition-colors duration-150"
                title="تصغير المعاينة"
                type="button"
              >
                <i className="fas fa-minus text-[10px]"></i>
              </button>
              
              <input 
                type="range" 
                min="0.4" 
                max="1.3" 
                step="0.05"
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-16 sm:w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 select-none mx-1"
              />
              
              <button 
                onClick={() => setZoom(Math.min(1.3, zoom + 0.05))}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer text-xs transition-colors duration-150"
                title="تكبير المعاينة"
                type="button"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>
              
              <span className="text-[10px] text-slate-400 px-1 font-mono">{Math.round(zoom * 100)}%</span>
            </div>

            <button
              onClick={triggerDocxDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-[10px] md:text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 border border-white/5 active:scale-[0.98]"
            >
              {isDownloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>يرجى الانتظار...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-download"></i>
                  <span>تنزيل ملف Word الاحترافي (.docx) 📥</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Main Workspace */}
        <div className="flex-1 flex flex-col bg-[#070b16] overflow-hidden active-sheet-wrapper p-2 md:p-4">
          
          {/* Centered Word document Scroll container */}
          <div id="word-preview-scroll-container" className="flex-1 w-full bg-slate-950/30 border border-white/5 rounded-2xl p-2 md:p-6 overflow-y-auto overflow-x-auto flex justify-center items-start custom-scrollbar shadow-inner relative group min-h-0">
            <div 
              className="flex justify-center transition-none relative"
              style={{
                width: `${210 * zoom}mm`,
                minHeight: `${297 * zoom}mm`,
                overflow: 'visible'
              }}
            >
              
              {/* Scaled document pages render container */}
              <div 
                id="word-export-element"
                className="text-slate-850 h-auto relative z-10 flex flex-col scroll-mt-2"
                style={{ 
                  width: '210mm',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  direction: 'rtl', 
                  textAlign: 'right' 
                }}
              >
                
                {/* 1. Word Cover Page Visual Layer */}
                {showCoverPage && (
                  <div 
                    className="w-full relative pointer-events-auto shrink-0 z-20 outline-none pr-0 bg-white" 
                    style={{
                       height: '1123px',
                       marginBottom: '40px'
                    }}
                  >
                    {renderCoverPagePreview()}
                  </div>
                )}

                {/* 2. Main Content Page Layer */}
                <div 
                  className="word-preview-page relative z-10 bg-white shadow-2xl p-16 flex flex-col"
                  style={{ minHeight: '1123px' }}
                >
                  
                  {/* Dynamic Custom Document Header Line */}
                  {showHeader && (
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-8 text-[10px] text-slate-400 select-none">
                      <span className="font-bold">{customTitle}</span>
                      <span className="font-mono text-slate-350">متوافق مع نماذج لجان التدقيق</span>
                    </div>
                  )}

                  {/* Render Compiled Preview blocks inside live frame */}
                  <div 
                    ref={contentEditableRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onInput={handleDirectDivEditInput}
                    className="flex-1 text-right outline-none focus:ring-1 focus:ring-blue-500/10 min-h-[500px]"
                    dangerouslySetInnerHTML={{ __html: customHtmlBody }}
                  />

                  {/* Dynamic Custom Document Footer Line */}
                  {showFooter && (
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-10 text-[9px] text-slate-400 select-none">
                      <span>{customFooterText}</span>
                      <span className="font-mono">صفحة ١ من ١</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* Floating Custom Format Configurator Popup Modal ("واجهة منبثقة") */}
        {showAdvancedStyles && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-[#0b0e17] border border-indigo-500/20 w-full max-w-3xl md:max-w-4xl max-h-[88vh] rounded-3xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-right" dir="rtl">
              
              {/* Configurator Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0e1322]/80">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    <i className="fas fa-sliders-h text-sm"></i>
                  </span>
                  <div>
                    <h4 className="text-white font-black text-sm md:text-base">لوحة تنسيق مستندات Word الفنية والجمالية 🎨</h4>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">صمم الهوية الأكاديمية والخطوط وألوان العناوين، ثم صدّر بنقرة واحدة</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowAdvancedStyles(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center transition-all cursor-pointer border border-white/5"
                  type="button"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>

              {/* Layout Sidebar Area */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#07090f]">
                
                {/* Custom Tabs */}
                <div className="w-full border-b border-white/5 bg-[#0b0f1a] p-3 overflow-x-auto custom-scrollbar shrink-0 select-none">
                  <div className="flex flex-row items-center gap-2.5 min-w-max md:min-w-0 md:grid md:grid-cols-7 w-full">
                    {[
                      { id: 'content', label: 'مضمون التقرير 📝', desc: 'صياغة الماركداون والترويسة', icon: 'fas fa-pen-nib' },
                      { id: 'cover', label: 'غلاف المخطوط 📄', desc: 'تخصيص كامل لمعلومات الغلاف', icon: 'fas fa-university' },
                      { id: 'images', label: 'الصور والوسائط 🖼️', desc: 'إضافة وتخصيص الصور والتحكم كالمحترفين', icon: 'fas fa-images' },
                      { id: 'presets', label: 'قوالب جاهزة 🎨', desc: 'تطبيق سمة متكاملة بضغطة', icon: 'fas fa-magic' },
                      { id: 'typography', label: 'الخطوط والسطور 📝', desc: 'حجم الخط والتنسيق الفضائي', icon: 'fas fa-font' },
                      { id: 'colors', label: 'ألوان الهوية 🖌️', desc: 'العناوين والأبرز والأرضية', icon: 'fas fa-palette' },
                      { id: 'layout', label: 'تخطيط وهوامش صفحة 📏', desc: 'الهوامش والبراويز والتذييل', icon: 'fas fa-crop-alt' }
                    ].map((tab) => {
                      const isActive = activeSetupTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSetupTab(tab.id as any)}
                          className={`flex-1 md:w-full text-right p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2.5 border ${
                            isActive
                              ? 'bg-blue-600/15 border-blue-500/40 text-blue-200'
                              : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                          type="button"
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#151b2a] text-slate-400'
                          }`}>
                            <i className={`${tab.icon} text-xs`}></i>
                          </span>
                          <div className="min-w-0 pr-0.5 text-right">
                            <div className="text-[11px] font-extrabold truncate text-white">{tab.label}</div>
                            <div className="text-[9px] text-slate-500 truncate mt-0.5">{tab.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Left Active Pane with Options */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto custom-scrollbar bg-[#080a10] flex flex-col justify-start min-h-0">
                  
                  {activeSetupTab === 'content' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-blue-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">تحرير المضمون وتعديل ملف الحفظ</h4>
                        <p className="text-slate-400 text-xs mt-1">عدل ترويسة الصفحة وادخل المضمون النصي لتحديث المعاينة تلقائياً:</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">اسم ملف حفظ الـ Word:</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono">.docx</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">الترويسة والترقيم الرئيسي:</label>
                          <input 
                            type="text" 
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-300 font-bold text-[11px] mb-1">نصوص المستند بنمط الماركداون المتقدم (قشور وتنسيقات):</label>
                        <textarea
                          rows={6}
                          value={markdownContent}
                          onChange={(e) => handleMarkdownTextTabChange(e.target.value)}
                          className="w-full bg-[#101726] border border-white/5 rounded-2xl p-4 text-white text-xs font-mono custom-scrollbar focus:outline-none focus:border-blue-500 leading-relaxed text-right"
                          placeholder="اكتب التقرير هنا باستخدام علامات الماركداون مثل # للعناوين و | للجداول..."
                        />
                      </div>
                    </div>
                  )}

                  {activeSetupTab === 'images' && (() => {
                    const docImages = (() => {
                      const images: { alt: string; url: string; index: number }[] = [];
                      const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
                      let match;
                      let idx = 0;
                      while ((match = imageRegex.exec(markdownContent)) !== null) {
                        images.push({
                          alt: match[1],
                          url: match[2],
                          index: idx++
                        });
                      }
                      return images;
                    })();

                    const categoryData: Record<string, { label: string; icon: string; items: { title: string; url: string }[] }> = {
                      science: {
                        label: 'علوم ومختبرات',
                        icon: 'fas fa-vials',
                        items: [
                          { title: 'أنابيب اختبار وتفاعلات ملونة', url: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مجهر ومعدات بحوث الخلايا', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80' },
                          { title: 'غرفة تحليل الأدوية والبيولوجيا', url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مكتبة كتب تاريخية وعلمية', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80' }
                        ]
                      },
                      tech: {
                        label: 'ذكاء اصطناعي وتكنولوجيا',
                        icon: 'fas fa-microchip',
                        items: [
                          { title: 'شبكة عصبية وذكاء خوارزمي ممتد', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80' },
                          { title: 'معالح الكتروني وهندسة البوردة', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
                          { title: 'كود برمجي لغوي معقد متماثل', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مطور يتعامل مع خوارزميات بيانية', url: 'https://images.unsplash.com/photo-1504607798333-52a30db54a5d?auto=format&fit=crop&w=800&q=80' }
                        ]
                      },
                      physics: {
                        label: 'فيزياء وفضاء وفلك',
                        icon: 'fas fa-orbit',
                        items: [
                          { title: 'كوكب الأرض في سياق الكون الفيدرالي', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
                          { title: 'سديم ومجرات الفضاء العميق الحالك', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مفاعل وموجات طاقة ضوئية دقيقة', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مصفوفة تلسكوب لرصد النجوم', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=800&q=80' }
                        ]
                      },
                      human: {
                        label: 'طب وصحة وبكتيريا',
                        icon: 'fas fa-dna',
                        items: [
                          { title: 'شريط الـ DNA الوراثي ثلاثي الأبعاد', url: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=800&q=80' },
                          { title: 'مستشفى وجداول تحليل نبض القلب بالكامل', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80' },
                          { title: 'زراعة خضراء وأبحاث البيئة والتربة', url: 'https://images.unsplash.com/photo-1463171359979-300801b2a987?auto=format&fit=crop&w=800&q=80' },
                          { title: 'فحص مجهري للعين وعلم الأعصاب', url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&w=800&q=80' }
                        ]
                      }
                    };

                    return (
                      <div className="space-y-5 animate-in fade-in duration-200">
                        {/* Summary of images */}
                        <div className="border-r-4 border-[#3b82f6] pr-3 flex items-center justify-between">
                          <div className="text-right">
                            <h4 className="text-white font-extrabold text-sm md:text-base">تحرير الصور واللوحات التوضيحية لملف Word 🖼️</h4>
                            <p className="text-slate-400 text-xs mt-1">تفريغ واستكشاف الصور المستخلصة في البحث، استبدالها برفع ملف من جهازك، أو إدراج روابط صور Unsplash دقيقة:</p>
                          </div>
                          <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono shrink-0">
                            الصور المكتشفة: {docImages.length}
                          </span>
                        </div>

                        {/* Top: Existing Document Images list */}
                        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3">
                          <h5 className="text-white font-bold text-xs md:text-sm flex items-center gap-2 text-indigo-300 text-right">
                            <i className="fas fa-file-image"></i> الصور الفعالة بصلب مستند الـ Word:
                          </h5>
                          
                          {docImages.length === 0 ? (
                            <div className="text-center py-6 px-4 border border-dashed border-white/10 rounded-2xl">
                              <i className="fas fa-image text-slate-600 text-3xl mb-2 block"></i>
                              <p className="text-slate-400 text-xs font-bold">لا توجد صور مضافة في هذا المستند حالياً.</p>
                              <p className="text-slate-500 text-[10px] mt-1">انقر على الأقسام العلمية في الأسفل لإدراج صور توضيحية فورية بنهاية المستند!</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-0.5">
                              {docImages.map((img, i) => {
                                const isSelected = selectedImageIndex === i;
                                return (
                                  <div 
                                    key={i} 
                                    className={`p-3 bg-[#111422] rounded-xl border transition-all flex flex-row gap-3 items-start relative ${
                                      isSelected ? 'border-indigo-500 bg-indigo-600/5' : 'border-white/5 hover:border-white/10'
                                    }`}
                                  >
                                    {/* Thumbnail Preview */}
                                    <div className="w-16 h-16 rounded-lg bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
                                      <img 
                                        src={img.url} 
                                        alt={img.alt} 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.opacity = '0.3';
                                        }}
                                        className="w-full h-full object-cover" 
                                      />
                                      <i className="fas fa-image absolute text-white/5 text-lg pointer-events-none"></i>
                                    </div>

                                    {/* Info Block */}
                                    <div className="flex-1 min-w-0 space-y-1.5 text-right">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-[#8da2ea] font-extrabold bg-[#1b2138] px-2 py-0.5 rounded-full font-mono">الصورة #{i + 1}</span>
                                        <button 
                                          type="button"
                                          onClick={() => handleDeleteImage(img.url, img.alt)}
                                          className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                                        >
                                          <i className="fas fa-trash-alt ml-1"></i> حذف
                                        </button>
                                      </div>

                                      {/* Caption Input */}
                                      <input 
                                        type="text" 
                                        value={img.alt} 
                                        onChange={(e) => handleReplaceImageUrl(img.url, img.url, img.alt, e.target.value)}
                                        placeholder="تسمية توضيحية للصورة..."
                                        className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans text-right"
                                      />

                                      {/* Replacing Actions */}
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {/* Local Replace Button */}
                                        <label className="bg-[#1e293b]/70 hover:bg-[#1e293b] text-slate-300 px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1">
                                          <i className="fas fa-upload text-[8px]"></i> رفع بديلة
                                          <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden" 
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                  if (ev.target?.result) {
                                                    handleReplaceImageUrl(img.url, ev.target.result as string, img.alt, img.alt);
                                                  }
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />
                                        </label>

                                        {/* URL input trigger */}
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setSelectedImageIndex(i);
                                            setImgCustomUrl(img.url);
                                            setImgAltInput(img.alt);
                                          }}
                                          className="bg-[#1e293b]/70 hover:bg-[#1e293b] text-indigo-300 px-2 py-1 rounded text-[9px] cursor-pointer"
                                        >
                                          <i className="fas fa-link text-[8px] ml-1"></i> تبديل بالرابط
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Specific image config */}
                          {selectedImageIndex !== null && docImages[selectedImageIndex] && (
                            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl animate-in slide-in-from-top-1 duration-150 space-y-2.5 text-right font-sans">
                              <div className="flex items-center justify-between">
                                <span className="text-white font-bold text-xs">تحديث الصورة #{selectedImageIndex + 1} بمصدر ويب مخصص:</span>
                                <button 
                                  onClick={() => setSelectedImageIndex(null)}
                                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                                  type="button"
                                >
                                  إلغاء التعديل
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-300 block">رابط الويب لمصدر الصورة:</label>
                                  <input 
                                    type="text" 
                                    value={imgCustomUrl}
                                    onChange={(e) => setImgCustomUrl(e.target.value)}
                                    placeholder="أدخل رابط صورة (http...) أو كود Base64..."
                                    className="w-full bg-[#161f32] border border-white/5 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-sans"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-slate-300 block">شرح وتسمية توضيحية بديلة:</label>
                                  <input 
                                    type="text" 
                                    value={imgAltInput}
                                    onChange={(e) => setImgAltInput(e.target.value)}
                                    placeholder="تسمية البحث التوضيحية..."
                                    className="w-full bg-[#161f32] border border-white/5 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-sans text-right"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentImg = docImages[selectedImageIndex];
                                  handleReplaceImageUrl(currentImg.url, imgCustomUrl, currentImg.alt, imgAltInput);
                                  setSelectedImageIndex(null);
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                تأكيد التبديل الفوري للمصدر ✓
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Interactive search and library section */}
                        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                          <h5 className="text-white font-bold text-xs md:text-sm flex items-center justify-between text-amber-400 text-right">
                            <span className="flex items-center gap-2">🕹️ مكتبة العلوم والرسومات واللوحات الموثوقة:</span>
                            <span className="text-[9px] text-slate-400">انقر فوق أي لوحة لإدراجها بصلب المستند</span>
                          </h5>

                          {/* Image Insertion Position Selector */}
                          <div className="bg-[#121824] p-3 rounded-xl border border-white/10 space-y-2 text-right">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                              <i className="fas fa-crosshairs text-indigo-400 ml-1"></i> موقع التركيب وإدراج الصورة في البحث:
                            </label>
                            <select
                              value={imgInsertPosition}
                              onChange={(e) => setImgInsertPosition(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2.5 py-1.5 text-white text-xs font-sans outline-none focus:border-indigo-500 text-right"
                            >
                              <option value="end">في نهاية البحث (ملحق)</option>
                              <option value="start">في بداية البحث (بعد الغلاف مباشرة)</option>
                              {availableHeadings.map((h, i) => (
                                <option key={i} value={h.full}>
                                  أسفل عنوان: {h.text.substring(0, 40)}{h.text.length > 40 ? '...' : ''}
                                </option>
                              ))}
                            </select>
                            <div className="text-[9px] text-slate-400">
                              حدد أين سيتم إضافة الصورة في سياق البحث (يساعد في دعم فقرة أو عنوان محدد بالصور التوضيحية لتكوين بحث احترافي متكامل).
                            </div>
                          </div>

                          {/* Quick Categories list */}
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {Object.entries(categoryData).map(([key, cat]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setMediaActiveCategory(key);
                                  // Pre-populate search query to fetch related online photos
                                  if (key === 'science') setImgSearchQuery('science laboratory');
                                  if (key === 'tech') setImgSearchQuery('neural artificial intelligence');
                                  if (key === 'physics') setImgSearchQuery('galaxy space nebula');
                                  if (key === 'human') setImgSearchQuery('biology structure cell');
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                  mediaActiveCategory === key 
                                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' 
                                    : 'bg-[#151b2a] border-white/5 text-slate-400 hover:text-white'
                                }`}
                              >
                                <i className={cat.icon}></i> {cat.label}
                              </button>
                            ))}
                          </div>

                          {/* Handpicked items */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {categoryData[mediaActiveCategory]?.items.map((item, idx) => (
                              <div 
                                key={idx}
                                className="group relative rounded-lg overflow-hidden border border-white/5 hover:border-indigo-500/40 bg-[#161f32]/40 p-1 flex flex-col justify-between hover:shadow transition-all h-[120px]"
                              >
                                <div className="w-full h-[70px] bg-black rounded overflow-hidden relative font-sans">
                                  <img 
                                    src={item.url} 
                                    alt={item.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                                  />
                                </div>
                                <div className="text-[8px] text-slate-305 truncate mt-1 px-1 font-sans text-right">{item.title}</div>
                                <button
                                  type="button"
                                  onClick={() => handleInsertImage(item.url, item.title)}
                                  className="bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-[8px] py-1 rounded cursor-pointer text-center font-bold mt-1"
                                >
                                  + إدراج الصورة
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Live search query logic */}
                          <div className="border-t border-white/5 pt-3 space-y-2 text-right">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">توليد وصور ذكية فورية عبر Prompt (بالانجليزية):</label>
                              <span className="bg-indigo-500/20 text-indigo-300 text-[8px] px-1.5 py-0.5 rounded border border-indigo-500/30">AI Generated</span>
                            </div>
                            <input 
                              type="text"
                              value={imgSearchQuery}
                              onChange={(e) => setImgSearchQuery(e.target.value)}
                              placeholder="مثل: microchip, futuristic city, genome, robotic arm..."
                              className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans text-right"
                            />

                            {imgSearchQuery.trim().length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                {[1, 2, 3, 4].map((id) => {
                                  const queryText = encodeURIComponent(imgSearchQuery.trim());
                                  const dynamicUrl = `https://image.pollinations.ai/prompt/${queryText}?seed=${id * 184}&width=800&height=600&nologo=true`;
                                  return (
                                    <div key={id} className="relative rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-400 bg-slate-900/50 p-1 h-[105px] flex flex-col justify-between">
                                      <div className="w-full h-[60px] bg-black rounded overflow-hidden">
                                        <img 
                                          src={dynamicUrl} 
                                          alt={imgSearchQuery} 
                                          referrerPolicy="no-referrer"
                                          crossOrigin="anonymous"
                                          className="w-full h-full object-cover" 
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleInsertImage(dynamicUrl, `${imgSearchQuery} (${id})`)}
                                        className="bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[8.5px] font-bold py-1 w-full rounded cursor-pointer"
                                      >
                                        إدراج الصورة هذه
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-white/5 pt-3 space-y-2 text-right">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">إدراج صورة من رابط خارجي (External URL):</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input 
                                type="text"
                                value={extImgInsertUrl}
                                onChange={(e) => setExtImgInsertUrl(e.target.value)}
                                placeholder="http://..."
                                className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans text-left"
                              />
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={extImgInsertAlt}
                                  onChange={(e) => setExtImgInsertAlt(e.target.value)}
                                  placeholder="وصف (اختياري)..."
                                  className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans text-right"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (extImgInsertUrl) {
                                      handleInsertImage(extImgInsertUrl, extImgInsertAlt || 'لوحة توضيحية مخصصة');
                                      setExtImgInsertUrl('');
                                      setExtImgInsertAlt('');
                                    }
                                  }}
                                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                                >
                                  إدراج مباشر
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3 space-y-2 text-right">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                              <i className="fas fa-upload text-indigo-400 ml-1"></i> رفع صورة من جهازك:
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (event.target?.result) {
                                        const base64Src = event.target.result.toString();
                                        let customTitle = extImgInsertAlt.trim();
                                        if (!customTitle) {
                                           customTitle = file.name ? file.name.split('.')[0].replace(/[-_]/g, ' ') : 'صورة مرفقة';
                                        }
                                        handleInsertImage(base64Src, customTitle);
                                        setExtImgInsertAlt('');
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                  }
                                }}
                                className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 font-sans cursor-pointer text-right"
                              />
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1">يُنصح بإضافة وصف قبل اختيار الملف ليكون هو عنوان الصورة في الفهرس.</p>
                          </div>

                          <div className="border-t border-white/5 pt-3 mt-2">
                             <div className="border-r-4 border-indigo-500 pr-3">
                                <label className="flex items-center gap-3 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20 cursor-pointer text-[10px] sm:text-xs text-indigo-300 hover:bg-indigo-950/40 transition-all font-bold group">
                                  <input 
                                    type="checkbox" 
                                    checked={showAppendixImages}
                                    onChange={(e) => setShowAppendixImages(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                                  />
                                  <span className="flex-1">تفعيل صفحة الملحق (Appendix)</span>
                                </label>
                                <p className="text-[9px] text-slate-500 mt-1">عند تفعيله، سيتم إنشاء صفحة مستقلة بنهاية الملف لعرض الصور المرفقة.</p>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {activeSetupTab === 'cover' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">تخصيص غلاف البحث الأكاديمي</h4>
                        <p className="text-slate-400 text-xs mt-1">تعديل كافة حقول ورقة الغلاف وتخطيها كلياً أو اختيار شكل الأقسام والخطوط:</p>
                      </div>

                      <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl">
                        <div>
                          <span className="text-white text-xs font-black block">تضمين صفحة الغلاف في المستند</span>
                          <span className="text-[10px] text-slate-405">توليد غلاف مخصص في بداية ملف الوورد كأول صفحة</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={showCoverPage}
                          onChange={(e) => setShowCoverPage(e.target.checked)}
                          className="w-10 h-6 bg-slate-800 rounded-full appearance-none cursor-pointer checked:bg-indigo-650 relative duration-300 before:absolute before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:right-1 checked:before:-translate-x-4 before:duration-300"
                        />
                      </div>

                      {showCoverPage && (
                        <>
                          {/* Layout design toggle */}
                          <div>
                            <label className="block text-slate-300 font-bold text-[11px] mb-2">اختر التنسيق الرأسي للغلاف:</label>
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { id: 'center', label: 'موسع وسطي' },
                                { id: 'classic', label: 'نخبة كلاسيكي' },
                                { id: 'striped', label: 'شريط جانبي' },
                                { id: 'formal', label: 'رسمي مبروز' },
                                { id: 'minimalist', label: 'بسيط عصري' }
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => setCoverLayout(option.id as any)}
                                  className={`p-2 rounded-xl text-center text-xs font-bold border transition-colors ${
                                    coverLayout === option.id 
                                      ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                      : 'bg-white/5 border-transparent text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">اسم المؤسسة/الجامعة:</label>
                              <input 
                                type="text" 
                                value={coverUniversity}
                                onChange={(e) => setCoverUniversity(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">الكلية المعنية:</label>
                              <input 
                                type="text" 
                                value={coverFaculty}
                                onChange={(e) => setCoverFaculty(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">القسم الأكاديمي:</label>
                              <input 
                                type="text" 
                                value={coverDepartment}
                                onChange={(e) => setCoverDepartment(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">اسم البحث الرئيسي:</label>
                              <input 
                                type="text" 
                                value={coverTitle}
                                onChange={(e) => setCoverTitle(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">العنوان الفرعي للغلاف:</label>
                              <input 
                                type="text" 
                                value={coverSubtitle}
                                onChange={(e) => setCoverSubtitle(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">اسم الطالب الباحث:</label>
                              <input 
                                type="text" 
                                value={coverStudent}
                                onChange={(e) => setCoverStudent(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">الرقم الجامعي/الكود:</label>
                              <input 
                                type="text" 
                                value={coverStudentId}
                                onChange={(e) => setCoverStudentId(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">الأستاذ المشرف:</label>
                              <input 
                                type="text" 
                                value={coverDoctor}
                                onChange={(e) => setCoverDoctor(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">المادة والمقرر البحثي:</label>
                              <input 
                                type="text" 
                                value={coverCourse}
                                onChange={(e) => setCoverCourse(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1">السنة الدراسية والفصل:</label>
                              <input 
                                type="text" 
                                value={coverYear}
                                onChange={(e) => setCoverYear(e.target.value)}
                                className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1.5">أيقونة الشعار المنتصف للغلاف:</label>
                              <div className="grid grid-cols-5 gap-1.5">
                                {[
                                  { id: 'crest', label: 'درع' },
                                  { id: 'grad', label: 'قبعة' },
                                  { id: 'atom', label: 'ذرة' },
                                  { id: 'book', label: 'كتاب' },
                                  { id: 'none', label: 'مخفي' }
                                ].map(logo => (
                                  <button
                                    key={logo.id}
                                    type="button"
                                    onClick={() => setCoverLogoType(logo.id as any)}
                                    className={`p-1.5 text-[10px] font-bold rounded-lg border text-center ${
                                      coverLogoType === logo.id 
                                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                                        : 'bg-white/5 border-transparent text-slate-400'
                                    }`}
                                  >
                                    {logo.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-300 font-bold text-[11px] mb-1.5">فاصل العناوين للغلاف:</label>
                              <div className="grid grid-cols-4 gap-1.5 align-middle">
                                {[
                                  { id: 'none', label: 'لا يوجد' },
                                  { id: 'thin', label: 'خط مبسط' },
                                  { id: 'double', label: 'خط مزدوج' },
                                  { id: 'fancy', label: 'زخرفي' }
                                ].map(line => (
                                  <button
                                    key={line.id}
                                    type="button"
                                    onClick={() => setCoverDivider(line.id as any)}
                                    className={`p-1.5 text-[10px] font-bold rounded-lg border text-center ${
                                      coverDivider === line.id 
                                        ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                                        : 'bg-white/5 border-transparent text-slate-400'
                                    }`}
                                  >
                                    {line.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeSetupTab === 'presets' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-violet-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">القوالب التنسيقية والأكاديمية الفورية 🎨</h4>
                        <p className="text-slate-400 text-xs mt-1">تخصيص كامل للهوية البصرية والخطوط والسطور والأحجام بنقرة سحرية واحدة:</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                        {STYLE_PRESETS.map(preset => {
                          const isActive = currentThemeId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => applyPreset(preset.id)}
                              className={`p-4 rounded-2xl border text-right transition-all group shrink-0 relative ${
                                isActive 
                                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg' 
                                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                              type="button"
                            >
                              <div className="flex items-center gap-3 mb-2.5">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-white"><i className={preset.icon}></i></span>
                                <span className="text-xs font-black text-white">{preset.name}</span>
                              </div>
                              <p className="text-[10px] leading-relaxed text-slate-400">{preset.theme.customSubtitle}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeSetupTab === 'typography' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-rose-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">بنية الخطوط والمسافات الرأسية 📝</h4>
                        <p className="text-slate-400 text-xs mt-1">تحكّم بالتباعد بين الأسطر ومسافات الفقرات وحجم الخطوط لتوفير تجربة قراءة مريحة للعين:</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-bold">نوع الخط الرئيسي المتناسق:</label>
                          <select 
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                          >
                            {arabicFonts.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-bold">تباعد الفقرات بالنقاط ({paragraphSpacing} pt):</label>
                          <input 
                            type="range" 
                            min="2" 
                            max="20" 
                            value={paragraphSpacing}
                            onChange={(e) => setParagraphSpacing(parseInt(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-bold">تباعد الأسطر بالفقرة الأولى ({lineHeight}):</label>
                          <input 
                            type="range" 
                            min="1.1" 
                            max="2.5" 
                            step="0.05"
                            value={lineHeight}
                            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-slate-300 text-[10px] font-bold">حجم خط الفقرات الأساسي ({baseFontSize} pt):</label>
                            <input 
                              type="number" 
                              min="8" 
                              max="18" 
                              step="0.5"
                              value={baseFontSize}
                              onChange={(e) => setBaseFontSize(parseFloat(e.target.value))}
                              className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-slate-300 text-[10px] font-bold">حجم خط العناوين الرئيسي ({headingFontSize} pt):</label>
                            <input 
                              type="number" 
                              min="14" 
                              max="32" 
                              step="0.5"
                              value={headingFontSize}
                              onChange={(e) => setHeadingFontSize(parseFloat(e.target.value))}
                              className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSetupTab === 'colors' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-teal-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">لوحة الألوان وواجهات التقرير الفنية</h4>
                        <p className="text-slate-400 text-xs mt-1">تحديد الهوية اللونية للمستند لتصدير منسق وجامع لكافة الرؤى العلمية:</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">اللون الرئيسي (H1/العناوين):</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={h1Color}
                              onChange={(e) => setH1Color(e.target.value)}
                              className="w-9 h-8 bg-transparent border-0 cursor-pointer outline-none rounded"
                            />
                            <input 
                              type="text" 
                              value={h1Color}
                              onChange={(e) => setH1Color(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">اللون الفرعي (البروز والأبرز):</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={accentColor} 
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-9 h-8 bg-transparent border-0 cursor-pointer outline-none rounded"
                            />
                            <input 
                              type="text" 
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">رأس جدول التقرير:</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={tableHeaderBg}
                              onChange={(e) => setTableHeaderBg(e.target.value)}
                              className="w-9 h-8 bg-transparent border-0 cursor-pointer outline-none rounded"
                            />
                            <input 
                              type="text" 
                              value={tableHeaderBg}
                              onChange={(e) => setTableHeaderBg(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون النصوص الأساسي:</label>
                          <div className="flex gap-2">
                            <input 
                              type="color" 
                              value={bodyTextColor}
                              onChange={(e) => setBodyTextColor(e.target.value)}
                              className="w-9 h-8 bg-transparent border-0 cursor-pointer outline-none rounded"
                            />
                            <input 
                              type="text" 
                              value={bodyTextColor}
                              onChange={(e) => setBodyTextColor(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSetupTab === 'layout' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-yellow-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">تخطيط وهوامش صفحة الـ Word 📏</h4>
                        <p className="text-slate-400 text-xs mt-1">تحديد الهوامش الحقيقية والإطارات الفنية وحجم التذييلات لتوزيع مثالي:</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-slate-300 text-xs font-bold">الهوامش الجانبية بالـ (مم) الحالي ({pageMargin} mm):</label>
                          <input 
                            type="range" 
                            min="10" 
                            max="30" 
                            value={pageMargin}
                            onChange={(e) => setPageMargin(parseInt(e.target.value))}
                            className="w-full accent-indigo-500"
                          />
                        </div>

                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl">
                          <div>
                            <span className="text-white text-xs font-black block">إطار برواز الصفحة الفني</span>
                            <span className="text-[10px] text-slate-400">تضمين برواز في معاينة وجوانب ورقة الوورد</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={showBorderFrame}
                            onChange={(e) => setShowBorderFrame(e.target.checked)}
                            className="w-10 h-6 bg-slate-800 rounded-full appearance-none cursor-pointer checked:bg-indigo-605 relative duration-300 before:absolute before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:right-1 checked:before:-translate-x-4 before:duration-300"
                          />
                        </div>

                        {showBorderFrame && (
                          <div className="grid grid-cols-3 gap-2 col-span-1 md:col-span-2">
                            {[
                              { id: 'single', label: 'خط مستمر فردي' },
                              { id: 'double', label: 'خط مزدوج فاخر' },
                              { id: 'dashed', label: 'خط مقطع' }
                            ].map(style => (
                              <button
                                key={style.id}
                                onClick={() => setBorderStyle(style.id)}
                                className={`p-2 rounded-xl text-center text-xs font-bold border ${
                                  borderStyle === style.id 
                                    ? 'bg-indigo-650/20 border-indigo-505 text-white' 
                                    : 'bg-white/5 border-transparent text-slate-400'
                                }`}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1 bg-white/5 p-3 rounded-2xl flex flex-col gap-1 col-span-1 md:col-span-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-white text-xs font-black block">تفعيل تذييل الصفحة</span>
                              <span className="text-[10px] text-slate-400">طباعة تذييل مخصص وترقيم الصفحات</span>
                            </div>
                            <input 
                              type="checkbox" 
                              checked={showFooter}
                              onChange={(e) => setShowFooter(e.target.checked)}
                              className="w-10 h-6 bg-slate-800 rounded-full appearance-none cursor-pointer checked:bg-indigo-655 relative duration-300 before:absolute before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:top-1 before:right-1 checked:before:-translate-x-4 before:duration-300"
                            />
                          </div>
                          {showFooter && (
                            <input 
                              type="text" 
                              value={customFooterText}
                              onChange={(e) => setCustomFooterText(e.target.value)}
                              placeholder="أدخل النص المخصص في الحاشية السفلية..."
                              className="w-full mt-2 bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Advanced Modal Footer Buttons */}
                <div className="bg-[#0e1322] border-t border-white/5 px-6 py-4 flex justify-between items-center">
                  <div className="text-right">
                    <span className="text-slate-450 text-[10px] block font-mono">MS Word DOCX Compiler v3.1</span>
                    <span className="text-white text-xs font-black">جاهز للتحويل والتصدير الفوري 📥</span>
                  </div>
                  
                  <button
                    onClick={() => setShowAdvancedStyles(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#20293a] text-white hover:bg-[#2e3748] font-bold text-xs cursor-pointer text-center"
                  >
                    موافق، حفظ وإغلاق التعديلات
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
