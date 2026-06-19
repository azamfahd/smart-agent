import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, AgentConfig } from '../../types';
import { THEME } from '../../constants';
import { validateAndFixTable } from '../../utils/tableValidator';

const detectContentType = (text: string): 'academic' | 'creative' | 'standard' => {
  if (!text) return 'standard';
  const textLower = text.toLowerCase();
  
  const academicTerms = [
    'المقدمة', 'الخاتمة', 'المنهجية', 'أهداف البحث', 'الدراسات السابقة', 
    'مبحث', 'الفصل الأول', 'المجمع', 'المراجع', 'المصادر', 'التوصيات', 
    'إشكالية', 'فرضيات', 'علمي', 'البحث العلمي', 'دراسة حالة', 'توثيق الأبحاث'
  ];
  let academicScore = 0;
  academicTerms.forEach(term => {
    if (textLower.includes(term)) academicScore++;
  });
  
  const citationMatches = (textLower.match(/\[\d+\]/g) || []).length + (textLower.match(/(\([\u0600-\u06FF\w\s]+[،,]\s*\d{4}\))/g) || []).length;
  if (citationMatches > 0) academicScore += 2;

  const creativeTerms = [
    'شعر', 'قصيدة', 'قصة', 'رواية', 'ألوان', 'جميل', 'رائع', 'إبداعي', 
    'خيال', 'بهجة', 'تصميم جميل', 'نصوص جميلة', 'ملون', 'حب', 'شروق'
  ];
  let creativeScore = 0;
  creativeTerms.forEach(term => {
    if (textLower.includes(term)) creativeScore++;
  });

  if (academicScore >= 1) return 'academic';
  if (creativeScore >= 1) return 'creative';
  return 'standard';
};

const getDomainName = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
};

const beautifyUrlLabel = (label: string): string => {
  if (!label) return '';
  let decoded = label.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch (e) {
    // Fallback if decodeURIComponent fails
  }

  // If it's a full URL, strip protocol and www
  if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
    decoded = decoded.replace(/^https?:\/\/(www\.)?/, '');
  }

  // Replace hyphens/underscores with spaces in the Arabic path parts to make them elegant, e.g. "الذكاء-الاصطناعي" -> "الذكاء الاصطناعي"
  if (/[\u0600-\u06FF]/.test(decoded)) {
    decoded = decoded.replace(/[-_]+/g, ' ');
  }

  // Clean trailing slash for absolute neatness
  if (decoded.endsWith('/')) {
    decoded = decoded.slice(0, -1);
  }

  return decoded;
};

interface MessageItemProps {
  msg: Message;
  activeAgent?: AgentConfig;
  onExport: (type: 'word' | 'excel' | 'pdf', msgIdOrContent: string) => void;
  onDownloadMedia: (url: string, filename: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ msg, activeAgent, onExport, onDownloadMedia }) => {
  const [showImage, setShowImage] = React.useState(true);
  const [loadingImage, setLoadingImage] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const isUser = msg.role === 'user';
  const styleType = detectContentType(msg.content || '');
  
  const renderContent = (contentRaw: string) => {
    if (!contentRaw) return null;

    // Clean up the cover data element so it doesn't render as XML text to the user
    const content = contentRaw.replace(/<div\s+id="cover-data"[^>]*>([\s\S]*?)<\/div>/gi, '');

    // Parse block codes first to isolate them from regex processing
    const blocks: { type: 'code' | 'text'; content: string; lang?: string }[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    let lastIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textAhead = content.substring(lastIndex, match.index);
      if (textAhead) {
        blocks.push({ type: 'text', content: textAhead });
      }
      blocks.push({ type: 'code', lang: match[1], content: match[2] });
      lastIndex = codeBlockRegex.lastIndex;
    }

    const textRemaining = content.substring(lastIndex);
    if (textRemaining) {
      blocks.push({ type: 'text', content: textRemaining });
    }

     return (
      <div className={`space-y-4 text-start font-sans text-[15px] md:text-[16px] leading-[1.8] sm:leading-loose ${isUser ? 'text-slate-50' : 'text-slate-200'} prose prose-invert prose-p:leading-loose max-w-full break-words`} dir="auto">
        {!isUser && styleType === 'academic' && (
          <div className="mb-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm animate-fade-in">
            <i className="fas fa-graduation-cap text-indigo-400"></i> بحث علمي وأكاديمي منسق وموثق
          </div>
        )}
        {!isUser && styleType === 'creative' && (
          <div className="mb-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm animate-fade-in font-sans">
            <i className="fas fa-sparkles text-rose-450"></i> نص إبداعي مصمم وملون بجمالية فائقة
          </div>
        )}
        {blocks.map((b, i) => {
          if (b.type === 'code') {
            return (
              <div key={i} className={`my-4 overflow-hidden rounded-2xl border ${isUser ? 'border-white/10 shadow-2xl bg-[#030712]' : 'border-slate-800 shadow-xl bg-slate-900'} font-mono text-xs md:text-sm`} dir="ltr">
                <div className={`px-4 py-2 flex items-center justify-between text-[10px] uppercase font-bold border-b ${isUser ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  <span>{b.lang || 'code-block'}</span>
                  <button 
                    onClick={(e) => {
                      navigator.clipboard.writeText(b.content);
                      const btn = e.currentTarget;
                      const origText = btn.innerHTML;
                      btn.innerHTML = '<i class="fas fa-check text-emerald-400"></i> تم النسخ!';
                      setTimeout(() => { btn.innerHTML = origText; }, 2000);
                    }}
                    className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-copy text-[9px]"></i> نسخ الكود
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-emerald-400 whitespace-pre scrollbar-thin">
                  <code>{b.content}</code>
                </pre>
              </div>
            );
          }

          const formatInline = (text: string) => {
            // Escape XML entities
            let html = text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

            // Markdown images: ![alt](url)
            html = html.replace(/!\[(.*?)\]\((.*?)\)/g, 
              '<div class="my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg flex flex-col items-center p-3 bg-[#111827]/80 max-w-lg mx-auto"><img src="$2" alt="$1" class="max-w-full h-auto rounded-lg max-h-96 object-contain" referrerpolicy="no-referrer" /><span class="text-xs text-slate-400 mt-2 font-medium text-center">$1</span></div>'
            );

            // Markdown links: [text](url) — with decoded and beautifully formatted text labels
            html = html.replace(/\[([^!\]]+?)]\((.*?)\)/g, (match, textContent, url) => {
              const beautifiedLabel = beautifyUrlLabel(textContent);
              return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-300 hover:text-sky-200 hover:underline inline-flex items-center gap-1 font-semibold break-all">${beautifiedLabel} <i class="fas fa-external-link-alt text-[9px]"></i></a>`;
            });

            // Bold markdown: **bold text**
            html = html.replace(/\*\*+([^\*\n]+?)\*\*+/g, (_, p) => isUser
              ? `<strong class="text-white font-extrabold bg-amber-500/25 px-1.5 py-0.5 rounded-md">${p.trim()}</strong>`
              : `<strong class="text-amber-300 font-extrabold bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/15">${p.trim()}</strong>`
            );
            
            // Italic markdown: *italic text*
            html = html.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, (_, p) => isUser
              ? `<em class="text-amber-200 italic font-medium">${p.trim()}</em>`
              : `<em class="text-indigo-300 italic font-medium">${p.trim()}</em>`
            );
            
            // Inline codes: `code`
            html = html.replace(/`([^`]+)`/g, isUser
              ? '<code class="bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono text-xs text-amber-200 font-semibold break-all overflow-hidden">$1</code>'
              : '<code class="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-rose-400 font-semibold break-all overflow-hidden">$1</code>'
            );

            // Academic Citations keys: [1], [2], [12] -> styled interactive numbers citations
            html = html.replace(/\[(\d+)\]/g, isUser
              ? '<span class="inline-flex items-center justify-center bg-amber-500/30 text-white border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium mx-0.5">[$1]</span>'
              : '<span class="inline-flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[10.5px] font-mono font-black mx-0.5 cursor-pointer" title="توثيق أكاديمي $1">[$1]</span>'
            );
            
            // Arabic/Academic Citations: (الأسعد، 2026) or (السالم وآخرون، 2026)
            html = html.replace(/(\([\u0600-\u06FF\w\s]+[،,]\s*\d{4}\))/g, isUser
              ? '<span class="inline-flex items-center bg-amber-500/20 text-white px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-500/30">$1</span>'
              : '<span class="inline-flex items-center bg-white/5 hover:bg-white/10 text-slate-300 px-1.5 py-0.5 rounded text-[11px] font-bold border border-white/5 cursor-help">$1</span>'
            );

            return <span dangerouslySetInnerHTML={{ __html: html }} />;
          };

          const lines = b.content.split('\n');
          const renderedLines: React.ReactNode[] = [];
          
          let listItems: React.ReactNode[] = [];
          let listType: 'bullet' | 'numeric' | null = null;
          let activeQuoteLines: string[] = [];

          let tableRows: React.ReactNode[][] = [];
          let tableHeaders: React.ReactNode[] = [];
          let insideTable = false;

          const flushTable = (keyPrefix: string) => {
            if (tableRows.length > 0 || tableHeaders.length > 0) {
              const { headers: validatedHeaders, rows: validatedRows } = validateAndFixTable(tableHeaders, tableRows);

              renderedLines.push(
                <div key={`table-wrapper-${keyPrefix}`} className={`my-6 overflow-hidden rounded-xl border ${isUser ? 'border-white/10' : 'border-indigo-100/20'} shadow-lg ${isUser ? 'bg-amber-950/20' : 'bg-white/[0.03]'}`}>
                  <table key={`table-${keyPrefix}`} className={`w-full text-xs md:text-sm text-right ${isUser ? 'text-amber-50' : 'text-slate-700'}`} dir="auto" style={{ borderCollapse: 'collapse' }}>
                    {validatedHeaders.length > 0 && (
                      <thead className={`${isUser ? 'bg-amber-800/40 text-amber-100' : 'bg-indigo-50 text-indigo-900'} font-bold border-b-2 ${isUser ? 'border-amber-700/50' : 'border-indigo-100'}`}>
                        <tr>
                          {validatedHeaders.map((hdr, idx) => (
                            <th key={idx} className="px-5 py-4 border-l border-white/10 last:border-0">{hdr}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody className={isUser ? '' : 'bg-white/50'}>
                      {validatedRows.map((row, rIdx) => (
                        <tr key={rIdx} className={`border-b ${isUser ? 'border-white/5' : 'border-slate-100'} ${isUser ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`px-5 py-3 leading-relaxed border-l ${isUser ? 'border-white/5' : 'border-slate-100'} last:border-0`}>{cell}</td>
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
                renderedLines.push(
                  <ul key={`ul-${keyPrefix}`} className="space-y-2.5 my-3 mr-2 list-disc list-inside">
                    {listItems}
                  </ul>
                );
              } else {
                renderedLines.push(
                  <ol key={`ol-${keyPrefix}`} className="space-y-3.5 my-4 mr-2 list-decimal list-inside">
                    {listItems}
                  </ol>
                );
              }
              listItems = [];
              listType = null;
            }
          };

          const flushQuote = (keyPrefix: string) => {
            if (activeQuoteLines.length > 0) {
              renderedLines.push(
                <blockquote 
                  key={`quote-${keyPrefix}`} 
                  className={isUser
                    ? "border-l-4 border-amber-400 bg-amber-500/5 py-2.5 pl-4 pr-3 my-3 rounded-r-2xl rounded-l-xs text-amber-100/90 text-xs md:text-sm leading-relaxed text-start italic"
                    : styleType === 'academic'
                      ? "border-l-4 border-indigo-400 bg-indigo-950/20 py-2.5 pl-4 pr-3 my-3 rounded-r-2xl text-slate-200 text-xs md:text-sm leading-relaxed text-start italic"
                      : styleType === 'creative'
                        ? "border-l-4 border-rose-400 bg-rose-950/30 py-3 pl-4 pr-3 my-4 rounded-r-2xl text-rose-100 text-xs md:text-sm leading-relaxed text-start italic shadow-lg shadow-rose-900/10"
                        : "border-l-4 border-indigo-500 bg-slate-50/5 py-2.5 pl-4 pr-3 my-3 rounded-r-2xl text-slate-250 text-xs md:text-sm leading-relaxed text-start italic"
                  }
                  dir="auto"
                >
                  {activeQuoteLines.map((ql, qIdx) => (
                    <div key={qIdx}>{formatInline(ql)}</div>
                  ))}
                </blockquote>
              );
              activeQuoteLines = [];
            }
          };

          lines.forEach((line, lineIdx) => {
            const trimmed = line.trim();
            const uniqueKey = `${i}-${lineIdx}`;
            const tableMatch = trimmed.match(/^\|(.+)\|$/);
            if (tableMatch) {
              const rowContent = tableMatch[1];
              if (/^[\-\|\s:]+$/.test(rowContent)) {
                 insideTable = true;
                 return;
              }
              const cells = rowContent.split('|').map(c => formatInline(c.trim()));
              
              if (!insideTable) {
                 insideTable = true;
                 tableHeaders = cells;
              } else {
                 tableRows.push(cells);
              }
              return;
            } else {
              flushTable(uniqueKey);
            }


            if (trimmed.startsWith('>')) {
               flushList(uniqueKey);
               flushTable(uniqueKey);
               const quoteContent = trimmed.substring(1).trim();
               activeQuoteLines.push(quoteContent);
               return;
            } else {
               flushQuote(uniqueKey);
               flushTable(uniqueKey);
            }

            if (trimmed.startsWith('#')) {
              flushList(uniqueKey);
               flushTable(uniqueKey);
              const level = (trimmed.match(/^#+/) || ['#'])[0].length;
              const titleText = trimmed.replace(/^#+\s*/, '');
              
              if (level === 1) {
                renderedLines.push(
                  <h1 key={uniqueKey} className={`text-base md:text-lg font-bold mt-5 mb-2.5 border-b pb-1.5 flex items-center gap-2 font-sans ${
                    isUser 
                      ? 'text-white border-white/10' 
                      : styleType === 'academic'
                        ? 'text-indigo-300 border-indigo-500/30'
                        : styleType === 'creative'
                          ? 'text-rose-300 border-rose-500/30'
                          : 'text-slate-100 border-white/10'
                  }`}>
                    <span className={`w-1.5 h-4.5 rounded ${
                      isUser 
                        ? 'bg-amber-400' 
                        : styleType === 'academic'
                          ? 'bg-indigo-400'
                          : styleType === 'creative'
                            ? 'bg-rose-400 animate-pulse'
                            : 'bg-indigo-600'
                    }`}></span>
                    {formatInline(titleText)}
                  </h1>
                );
              } else if (level === 2) {
                renderedLines.push(
                  <h2 key={uniqueKey} className={`text-sm md:text-base font-bold mt-4 mb-2 flex items-center gap-1.5 font-sans ${
                    isUser 
                      ? 'text-indigo-200' 
                      : styleType === 'academic'
                        ? 'text-sky-300'
                        : styleType === 'creative'
                          ? 'text-pink-300'
                          : 'text-indigo-300'
                  }`}>
                    <span className={`w-1 h-3.5 rounded-sm ${
                      isUser 
                        ? 'bg-indigo-200' 
                        : styleType === 'academic'
                          ? 'bg-sky-400'
                          : styleType === 'creative'
                            ? 'bg-pink-400'
                            : 'bg-indigo-500'
                    }`}></span>
                    {formatInline(titleText)}
                  </h2>
                );
              } else {
                renderedLines.push(
                  <h3 key={uniqueKey} className={`text-xs md:text-sm font-bold mt-3 mb-1.5 flex items-center gap-1 font-sans ${
                    isUser 
                      ? 'text-indigo-100' 
                      : styleType === 'academic'
                        ? 'text-indigo-200'
                        : styleType === 'creative'
                          ? 'text-fuchsia-300'
                          : 'text-slate-300'
                  }`}>
                    <i className={`fas fa-caret-left text-[10px] ${
                      isUser 
                        ? 'text-indigo-300' 
                        : styleType === 'academic'
                          ? 'text-indigo-400'
                          : styleType === 'creative'
                            ? 'text-rose-400'
                            : 'text-indigo-500'
                    }`}></i>
                    {formatInline(titleText)}
                  </h3>
                );
              }
              return;
            }

            if (trimmed === '---' || trimmed === '***') {
              flushList(uniqueKey);
               flushTable(uniqueKey);
              renderedLines.push(<hr key={uniqueKey} className={`my-5 border-t ${isUser ? 'border-white/15' : 'border-slate-200/10'}`} />);
              return;
            }

            const bulletMatch = line.match(/^(\s*)([\-\*\•])\s+(.*)/);
            if (bulletMatch) {
              if (listType !== 'bullet') {
                flushList(uniqueKey);
               flushTable(uniqueKey);
                listType = 'bullet';
              }
              listItems.push(
                <li key={`li-${uniqueKey}`} className={`flex items-start gap-2 py-0.5 text-start font-sans ${isUser ? 'text-white/90' : 'text-slate-200'}`} dir="auto">
                  <span className={`${
                    isUser 
                      ? 'text-amber-400' 
                      : styleType === 'academic'
                        ? 'text-indigo-400'
                        : styleType === 'creative'
                          ? 'text-rose-400'
                          : 'text-indigo-500'
                  } mt-1.5 text-xs shrink-0`}>
                    {styleType === 'creative' ? '🌸' : '●'}
                  </span>
                  <span className={`flex-1 leading-relaxed ${
                    isUser 
                      ? 'text-white' 
                      : styleType === 'creative'
                        ? 'text-rose-100 font-medium'
                        : 'text-slate-200'
                  }`}>{formatInline(bulletMatch[3])}</span>
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
              const numVal = numMatch[2];
              listItems.push(
                <li key={`li-${uniqueKey}`} className="flex items-start gap-2.5 py-1">
                  <span className={isUser
                    ? "bg-indigo-850 text-white border border-indigo-500 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-mono font-black shrink-0 min-w-[22px] text-center shadow-inner"
                    : styleType === 'academic'
                      ? "bg-indigo-900/40 text-indigo-200 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-mono font-black shrink-0 min-w-[22px] text-center shadow-md"
                      : styleType === 'creative'
                        ? "bg-rose-950/40 text-rose-200 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-mono font-black shrink-0 min-w-[22px] text-center shadow-md"
                        : "bg-indigo-50/10 text-indigo-300 border border-white/10 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-mono font-black shrink-0 min-w-[22px] text-center shadow-inner"
                  }>
                    {numVal}
                  </span>
                  <span className={`flex-1 leading-relaxed ${
                    isUser 
                      ? 'text-white font-medium' 
                      : styleType === 'creative'
                        ? 'text-rose-150 font-medium'
                        : 'text-slate-200'
                  }`}>{formatInline(numMatch[3])}</span>
                </li>
              );
              return;
            }

            if (!trimmed) {
              flushList(uniqueKey);
               flushTable(uniqueKey);
              renderedLines.push(<div key={uniqueKey} className="h-2"></div>);
              return;
            }

            flushList(uniqueKey);
               flushTable(uniqueKey);
            renderedLines.push(
              <p key={uniqueKey} className="text-start leading-relaxed whitespace-pre-wrap py-0.5 break-words" dir="auto">
                {formatInline(line)}
              </p>
            );
          });

          flushList(`final-${i}`);
          flushQuote(`final-${i}`);
          flushTable(`final-${i}`);

          return <div key={i} className="space-y-2">{renderedLines}</div>;
        })}
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        
        <div className={`flex flex-col gap-3 w-full ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`relative px-6 py-5 w-full rounded-2xl transition-all duration-300 break-words overflow-hidden ${
            isUser 
            ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/20 border border-amber-500/25 text-white shadow-xl shadow-amber-500/5 rounded-br-none' 
            : 'bg-[#0f1430]/70 backdrop-blur-md text-slate-100 border border-white/10 shadow-2xl rounded-bl-none'
          }`}>
            {msg.type === 'image' && msg.imageUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 relative group bg-[#090d22]">
                {showImage ? (
                  <div className="relative min-h-[220px] flex items-center justify-center bg-slate-950/40">
                    {loadingImage && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 transition-all duration-300">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping"></div>
                          <div className="absolute inset-x-0 inset-y-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
                          <i className="fas fa-magic text-amber-400 text-lg"></i>
                        </div>
                        <span className="text-amber-400/90 text-xs font-semibold animate-pulse tracking-wide font-sans">جاري تحميل وتجهيز الصورة...</span>
                      </div>
                    )}
                    {imageError ? (
                      <div className="p-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-950/40 text-slate-300 w-full min-h-[260px]">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-1 border border-red-500/20">
                          <i className="fas fa-exclamation-triangle text-lg"></i>
                        </div>
                        <span className="text-sm font-semibold text-slate-200">حدث خطأ في تحميل الصورة من خوادم الإنشاء التلقائي</span>
                        <p className="text-xs text-slate-400 max-w-xs">قد تكون هناك مشكلة ضغط أو حظر مؤقت من المزود. جرب إعادة المحاولة، أو افتح الصورة مباشرة.</p>
                        <div className="flex flex-wrap justify-center gap-2.5 mt-2">
                          <button
                            onClick={() => {
                              setImageError(false);
                              setLoadingImage(true);
                              const img = document.querySelector(`img[src="${msg.imageUrl}"]`) as HTMLImageElement;
                              if (img) {
                                const currentSrc = img.src;
                                img.src = '';
                                setTimeout(() => {
                                  img.src = currentSrc + (currentSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                                }, 100);
                              }
                            }}
                            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all duration-300 shadow-md shadow-amber-500/10 flex items-center gap-1.5"
                          >
                            <i className="fas fa-sync-alt"></i> إعادة المحاولة
                          </button>
                          <a
                            href={msg.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all duration-300 flex items-center gap-1.5"
                          >
                            <i className="fas fa-external-link-alt"></i> فتح الرابط المباشر للمعاينة
                          </a>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={msg.imageUrl} 
                        alt="Generated" 
                        referrerPolicy="no-referrer" 
                        onLoad={() => {
                          setLoadingImage(false);
                          setImageError(false);
                        }}
                        onError={() => {
                          setLoadingImage(false);
                          setImageError(true);
                        }}
                        className={`max-w-full h-auto max-h-[550px] object-contain transition-all duration-700 ease-out group-hover:scale-[1.02] ${loadingImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} 
                      />
                    )}
                    {!loadingImage && !imageError && (
                      <>
                        <button 
                          onClick={() => onDownloadMedia(msg.imageUrl!, `image-${Date.now()}.png`)}
                          className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md hover:bg-amber-500 hover:text-white text-slate-100 w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg border border-white/10 z-20"
                          title="تحميل الصورة"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                        <button 
                          onClick={() => {
                            setShowImage(false);
                            setLoadingImage(false);
                          }}
                          className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md hover:bg-red-500 hover:text-white text-slate-100 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg border border-white/10 z-20"
                          title="إغلاق العرض"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setLoadingImage(true);
                      setShowImage(true);
                    }}
                    className="w-full h-56 bg-gradient-to-br from-slate-900/60 to-slate-800/60 hover:from-slate-800/80 hover:to-slate-700/80 flex flex-col items-center justify-center text-amber-500 hover:text-amber-400 transition-all duration-300 border border-dashed border-amber-500/20 hover:border-amber-500/40 select-none group/btn shadow-inner"
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 group-hover/btn:scale-110 group-hover/btn:bg-amber-500/20 transition-all duration-300 shadow-md">
                      <i className="fas fa-image text-2xl animate-pulse"></i>
                    </div>
                    <span className="font-bold text-sm tracking-wide">رسم كرتوني / صورة جاهزة للإنشاء</span>
                    <span className="font-medium text-[13px] text-amber-400/95 mt-1">اضغط هنا لعرض الصورة في ثوانٍ معدودة</span>
                    <span className="text-[11px] text-slate-400 mt-1 font-mono">أبعاد الدقة الاحترافية: 1024 × 1024 بكسل</span>
                  </button>
                )}
              </div>
            )}
            
            {msg.type === 'video' && msg.videoUrl && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 relative group">
                <video src={msg.videoUrl} controls className="max-w-full h-auto" />
                <button 
                  onClick={() => onDownloadMedia(msg.videoUrl!, `video-${Date.now()}.mp4`)}
                  className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 text-slate-100 w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-lg border border-white/10"
                >
                  <i className="fas fa-download"></i>
                </button>
              </div>
            )}

            <div className="text-sm md:text-[15px] break-words overflow-hidden" id={`msg-${msg.id}`}>
               <div className="prose prose-invert prose-p:leading-loose max-w-full break-words">
                 <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="w-full text-right border-collapse rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-700/50" {...props} /></div>,
                      th: ({node, ...props}) => <th className="bg-slate-800/80 px-4 py-3 font-semibold text-slate-200 border-b border-slate-700/50 text-right" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 border-b border-slate-700/30 text-slate-300 text-right leading-relaxed" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-indigo-300 mb-4 mt-8 leading-tight break-words" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold text-indigo-200 mb-3 mt-6 pb-2 border-b border-slate-700/30 leading-tight break-words" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-200 mb-2 mt-5 leading-snug break-words" {...props} />,
                      a: ({node, ...props}) => {
                        let label: any = props.children;
                        const href = props.href || '';
                        
                        const isPdf = href.toLowerCase().endsWith('.pdf') || href.toLowerCase().includes('/pdf/');
                        const isAcademic = href.toLowerCase().includes('scholar.google') || href.toLowerCase().includes('pubmed.ncbi') || href.toLowerCase().includes('researchgate') || href.toLowerCase().includes('doi.org') || href.toLowerCase().includes('sciencedirect') || href.toLowerCase().includes('nature.com') || href.toLowerCase().includes('springer.com') || href.toLowerCase().includes('vertexaisearch') || href.toLowerCase().includes('scribd');
                        
                        const icon = isPdf ? 'fa-file-pdf text-rose-400' : isAcademic ? 'fa-graduation-cap text-indigo-400' : 'fa-globe text-blue-400';
                        const bgIconColor = isPdf ? 'bg-rose-500/20 group-hover:bg-rose-500' : isAcademic ? 'bg-indigo-500/20 group-hover:bg-indigo-500' : 'bg-blue-500/20 group-hover:bg-blue-500';
                        const sourceType = isPdf ? 'ملف PDF' : isAcademic ? 'مقال علمي' : 'صفحة ويب';
                        
                        const processTxt = (txt: string) => {
                           if (txt.includes('http') || txt.includes('vertexaisearch')) {
                               if (txt.includes('vertexaisearch')) {
                                   return 'المرجع موثق (Vertex AI)';
                               }
                               try {
                                   return new URL(txt).hostname.replace(/^www\./, '');
                               } catch(e) {
                                   return txt.substring(0, 30) + '...';
                               }
                           }
                           return txt;
                        };

                        if (Array.isArray(props.children) && props.children.length === 1 && typeof props.children[0] === 'string') {
                           label = processTxt(props.children[0]);
                        } else if (typeof props.children === 'string') {
                           label = processTxt(props.children);
                        }

                        // Special simple handling for footnote markers and anchor links
                        if (typeof label === 'string' && (label.startsWith('^') || label.length <= 4)) {
                          return <a className="text-indigo-400 hover:text-indigo-300 font-bold px-1" href={href} target="_blank" rel="noopener noreferrer">[{label}]</a>;
                        }

                        return (
                          <a 
                            className="inline-flex items-center gap-2 bg-[#1b2333]/80 hover:bg-[#20293c] border border-slate-700/60 hover:border-indigo-500/50 px-2 py-1.5 rounded-lg text-xs transition-all no-underline mx-1 align-middle my-1 shadow-sm group"
                            target="_blank" 
                            rel="noopener noreferrer" 
                            href={href}
                          >
                            <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md ${bgIconColor} transition-colors`}>
                              <i className={`fas ${icon} text-[11px] group-hover:text-white transition-colors`}></i>
                            </span>
                            <span className="truncate max-w-[150px] sm:max-w-[200px] font-medium text-slate-200" dir="rtl">{label}</span>
                            <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                               {sourceType}
                            </span>
                          </a>
                        );
                      },
                      blockquote: ({node, ...props}) => <blockquote className="border-r-4 border-indigo-500/50 pr-4 pl-0 py-2 my-4 bg-slate-800/20 italic text-slate-300 rounded-l-lg" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pr-5 my-3 space-y-1.5 text-slate-300 marker:text-indigo-500/70" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pr-5 my-3 space-y-1.5 text-slate-300 marker:text-indigo-500/70 font-mono" {...props} />,
                      li: ({node, ...props}) => <li className="pl-0" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-300 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-indigo-200 mx-1" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-slate-300 font-medium" {...props} />
                    }}
                  >
                    {msg.content
                      .replace(/<div\s+id="cover-data"[^>]*>([\s\S]*?)<\/div>/gi, '')
                      .replace(/\*\*+([^\*\n]+?)\*\*+/g, (_, p) => `**${p.trim()}**`) // Fix RTL bold spacing, prevent newline matches
                      .replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, (_, p) => `*${p.trim()}*`) // Fix RTL italic spacing
                    }
                  </ReactMarkdown>
               </div>
            </div>

            {!isUser && msg.type === 'text' && (
              <>
                {styleType === 'academic' && (
                  <div className="mt-4 pt-3.5 border-t border-indigo-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                      <span className="text-[11px] text-slate-400">جاهز للتصدير الأكاديمي والطباعة الفورية</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onExport('pdf', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-600/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-pdf text-[13px] text-red-300"></i>
                          <span>PDF</span>
                        </button>
                        <button 
                          onClick={() => onExport('word', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-word text-[13px] text-blue-300"></i>
                          <span>Word</span>
                        </button>
                    </div>
                  </div>
                )}
                {styleType === 'creative' && (
                  <div className="mt-4 pt-3.5 border-t border-rose-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-450 animate-pulse"></span>
                      <span className="text-[11px] text-slate-400">جاهز للطباعة والاحتفاظ بالتنسيق الفني الملون</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onExport('pdf', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/15 hover:shadow-rose-600/25 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-pdf text-[13px] text-red-250"></i>
                          <span>PDF</span>
                        </button>
                        <button 
                          onClick={() => onExport('word', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-word text-[13px] text-blue-300"></i>
                          <span>Word</span>
                        </button>
                    </div>
                  </div>
                )}
                {styleType === 'standard' && (
                  <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-505 animate-pulse"></span>
                       <span className="text-[11px] text-slate-400">تصدير المستند</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onExport('pdf', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-pdf text-[13px] text-red-400"></i>
                          <span>PDF</span>
                        </button>
                        <button 
                          onClick={() => onExport('word', msg.content)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-95 cursor-pointer"
                        >
                          <i className="fas fa-file-word text-[13px] text-blue-300"></i>
                          <span>Word</span>
                        </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {msg.sources && msg.sources.length > 0 && (
              <div className={`mt-6 pt-5 border-t ${isUser ? 'border-amber-500/20' : 'border-indigo-500/20'}`}>
                <div className={`flex items-center gap-2 mb-3 text-[11px] md:text-xs font-bold ${isUser ? 'text-amber-200' : 'text-slate-300'}`}>
                   <div className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border shadow-sm ${
                     isUser 
                     ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                     : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                   }`}>
                     <i className="fas fa-book-open text-[10px]"></i>
                   </div>
                   <span>المصادر والمراجع:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((s, i) => (
                    <a 
                      key={i} 
                      href={s.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all duration-200 shadow-sm active:scale-95 ${
                        isUser
                        ? 'bg-amber-950/20 hover:bg-amber-900/40 border-amber-500/15 text-amber-200'
                        : 'bg-white/5 hover:bg-indigo-950/30 border-white/5 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-200'
                      }`}
                    >
                      <i className={`fas fa-link text-[10px] opacity-70 ${isUser ? 'text-amber-400' : 'text-indigo-400'}`}></i>
                      <span className="max-w-[150px] sm:max-w-[220px] truncate">{s.title || 'مصدر خارجي'}</span>
                      <span className="opacity-40 text-[9px] font-normal truncate max-w-[80px]" dir="ltr">({beautifyUrlLabel(s.uri)})</span>
                      <i className="fas fa-external-link-alt text-[8px] opacity-40 group-hover:opacity-100"></i>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {msg.modelName && (
               <div className={`mt-3 text-[9px] font-mono tracking-widest text-left uppercase ${isUser ? 'text-slate-400' : 'text-slate-400 font-bold opacity-75'}`} dir="ltr">
                  {msg.modelName}
               </div>
            )}
          </div>


          {!isUser && msg.type === 'text' && (
            <div className="flex items-center gap-2 px-2 opacity-50 hover:opacity-100 transition-all duration-300">
              <button onClick={() => navigator.clipboard.writeText(msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="نسخ"><i className="fas fa-copy text-xs"></i></button>
              <button onClick={() => onExport('word', msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="Word"><i className="fas fa-file-word text-xs"></i></button>
              <button onClick={() => onExport('excel', msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="Excel"><i className="fas fa-file-excel text-xs"></i></button>
              <button onClick={() => onExport('pdf', msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="PDF"><i className="fas fa-file-pdf text-xs"></i></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;