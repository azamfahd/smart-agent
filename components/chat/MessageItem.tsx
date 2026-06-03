import React, { memo } from 'react';
import { Message, AgentConfig } from '../../types';
import { THEME } from '../../constants';

interface MessageItemProps {
  msg: Message;
  activeAgent?: AgentConfig;
  onExport: (type: 'pdf' | 'word' | 'excel', msgIdOrContent: string) => void;
  onDownloadMedia: (url: string, filename: string) => void;
  onSendToResearch?: (text: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ msg, activeAgent, onExport, onDownloadMedia, onSendToResearch }) => {
  const isUser = msg.role === 'user';
  
  const renderContent = (content: string) => {
    if (!content) return null;

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
      <div className={`space-y-3.5 text-right font-sans text-sm md:text-[15px] leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`} dir="rtl">
        {blocks.map((b, i) => {
          if (b.type === 'code') {
            return (
              <div key={i} className="my-4 overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-slate-950 font-mono text-xs md:text-sm" dir="ltr">
                <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold border-b border-white/5">
                  <span>{b.lang || 'code-block'}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(b.content);
                      alert('تم نسخ الكود بنجاح!');
                    }}
                    className="text-indigo-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <i className="fas fa-copy text-[9px]"></i> نسخ الكود
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-emerald-300 whitespace-pre scrollbar-thin">
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

            // Bold markdown: **bold text**
            html = html.replace(/\*\*(.*?)\*\*/g, isUser
              ? '<strong class="text-white font-extrabold bg-indigo-700/50 px-1.5 py-0.5 rounded-md">$1</strong>'
              : '<strong class="text-slate-950 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded-md">$1</strong>'
            );
            
            // Italic markdown: *italic text*
            html = html.replace(/\*(.*?)\*/g, isUser
              ? '<em class="text-indigo-200 italic font-medium">$1</em>'
              : '<em class="text-indigo-750 italic font-bold">$1</em>'
            );
            
            // Inline codes: `code`
            html = html.replace(/`([^`]+)`/g, isUser
              ? '<code class="bg-indigo-800 border border-indigo-500 px-1.5 py-0.5 rounded font-mono text-xs text-amber-200 font-semibold">$1</code>'
              : '<code class="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-xs text-rose-600 font-semibold">$1</code>'
            );

            // Academic Citations keys: [1], [2], [12] -> styled interactive numbers citations
            html = html.replace(/\[(\d+)\]/g, isUser
              ? '<span class="inline-flex items-center justify-center bg-indigo-700 text-white border border-indigo-500 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium mx-0.5">[$1]</span>'
              : '<span class="inline-flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 px-1.5 py-0.5 rounded text-[10.5px] font-mono font-black mx-0.5 cursor-pointer" title="توثيق أكاديمي $1">[$1]</span>'
            );
            
            // Arabic/Academic Citations: (الأسعد، 2026) or (السالم وآخرون، 2026)
            html = html.replace(/(\([\u0600-\u06FF\w\s]+[،,]\s*\d{4}\))/g, isUser
              ? '<span class="inline-flex items-center bg-indigo-700 text-white px-1.5 py-0.5 rounded text-[10px] font-medium border border-indigo-500/80">$1</span>'
              : '<span class="inline-flex items-center bg-slate-100 hover:bg-indigo-50 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-bold border border-indigo-100/60 cursor-help">$1</span>'
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
              renderedLines.push(
                <div key={`table-wrapper-${keyPrefix}`} className={`my-5 overflow-x-auto rounded-xl border shadow-sm ${isUser ? 'border-white/10 bg-indigo-900/20' : 'border-slate-200/60 bg-white'}`}>
                  <table key={`table-${keyPrefix}`} className={`w-full text-sm text-right ${isUser ? 'text-indigo-100' : 'text-slate-800'}`}>
                    {tableHeaders.length > 0 && (
                      <thead className={`text-xs uppercase font-bold ${isUser ? 'text-indigo-200 bg-indigo-900/50' : 'text-slate-700 bg-slate-50'}`}>
                        <tr>
                          {tableHeaders.map((hdr, idx) => (
                            <th key={idx} className={`px-5 py-3 border-b ${isUser ? 'border-white/10' : 'border-slate-200'}`}>{hdr}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {tableRows.map((row, rIdx) => (
                        <tr key={rIdx} className={`border-b transition-colors ${isUser ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50/70'}`}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-5 py-3 leading-relaxed">{cell}</td>
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
                  <ul key={`ul-${keyPrefix}`} className="space-y-2.5 my-3 mr-2">
                    {listItems}
                  </ul>
                );
              } else {
                renderedLines.push(
                  <ol key={`ol-${keyPrefix}`} className="space-y-3.5 my-4 mr-2">
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
                    ? "border-r-4 border-amber-400 bg-indigo-700/50 py-2.5 pr-4 pl-3 my-3 rounded-l-2xl rounded-r-xs text-indigo-105 text-xs md:text-sm leading-relaxed text-justify italic"
                    : "border-r-4 border-indigo-600 bg-slate-50 py-2.5 pr-4 pl-3 my-3 rounded-l-2xl rounded-r-xs text-slate-750 text-xs md:text-sm leading-relaxed text-justify italic"
                  }
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
                  <h1 key={uniqueKey} className={`text-base md:text-lg font-bold mt-5 mb-2.5 border-b pb-1.5 flex items-center gap-2 font-sans ${isUser ? 'text-white border-white/10' : 'text-slate-900 border-slate-100'}`}>
                    <span className={`w-1.5 h-4.5 rounded ${isUser ? 'bg-amber-400' : 'bg-indigo-600'}`}></span>
                    {formatInline(titleText)}
                  </h1>
                );
              } else if (level === 2) {
                renderedLines.push(
                  <h2 key={uniqueKey} className={`text-sm md:text-base font-bold mt-4 mb-2 flex items-center gap-1.5 font-sans ${isUser ? 'text-indigo-200' : 'text-indigo-850'}`}>
                    <span className={`w-1 h-3.5 rounded-sm ${isUser ? 'bg-indigo-200' : 'bg-indigo-500'}`}></span>
                    {formatInline(titleText)}
                  </h2>
                );
              } else {
                renderedLines.push(
                  <h3 key={uniqueKey} className={`text-xs md:text-sm font-bold mt-3 mb-1.5 flex items-center gap-1 font-sans ${isUser ? 'text-indigo-100' : 'text-slate-750'}`}>
                    <i className={`fas fa-caret-left text-[10px] ${isUser ? 'text-indigo-300' : 'text-indigo-500'}`}></i>
                    {formatInline(titleText)}
                  </h3>
                );
              }
              return;
            }

            if (trimmed === '---' || trimmed === '***') {
              flushList(uniqueKey);
               flushTable(uniqueKey);
              renderedLines.push(<hr key={uniqueKey} className={`my-5 border-t ${isUser ? 'border-white/15' : 'border-slate-100'}`} />);
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
                <li key={`li-${uniqueKey}`} className={`flex items-start gap-2 py-0.5 text-right font-sans ${isUser ? 'text-white/90' : 'text-slate-755'}`}>
                  <span className={`${isUser ? 'text-amber-400' : 'text-indigo-600'} mt-1.5 text-xs shrink-0`}>●</span>
                  <span className="flex-1 leading-relaxed">{formatInline(bulletMatch[3])}</span>
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
                    : "bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-mono font-black shrink-0 min-w-[22px] text-center shadow-inner"
                  }>
                    {numVal}
                  </span>
                  <span className={`flex-1 leading-relaxed ${isUser ? 'text-white font-medium' : 'text-slate-800'}`}>{formatInline(numMatch[3])}</span>
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
              <p key={uniqueKey} className="text-justify leading-relaxed whitespace-pre-wrap py-0.5">
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
          <div className={`relative px-6 py-4 w-full ${THEME.rounded} ${THEME.shadow} border ${
            isUser 
            ? 'bg-indigo-600 text-white border-indigo-500 rounded-xl' 
            : 'bg-white text-slate-900 border-slate-200 shadow-[0_15px_30px_rgba(15,23,42,0.08)] rounded-xl'
          }`}>
            {msg.type === 'image' && msg.imageUrl && (
               <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 relative group">
                  <img src={msg.imageUrl} alt="Generated" className="max-w-full h-auto transition-transform duration-500 group-hover:scale-105" />
                  <button 
                    onClick={() => onDownloadMedia(msg.imageUrl!, `image-${Date.now()}.png`)}
                    className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                  >
                    <i className="fas fa-download"></i>
                  </button>
               </div>
            )}
            
            {msg.type === 'video' && msg.videoUrl && (
               <div className="mb-4 rounded-2xl overflow-hidden border border-white/10 relative group">
                  <video src={msg.videoUrl} controls className="max-w-full h-auto" />
                  <button 
                    onClick={() => onDownloadMedia(msg.videoUrl!, `video-${Date.now()}.mp4`)}
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white w-10 h-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center"
                  >
                    <i className="fas fa-download"></i>
                  </button>
               </div>
            )}

            <div className="text-sm md:text-[15px]" id={`msg-${msg.id}`}>
               {renderContent(msg.content)}
            </div>

            {msg.sources && msg.sources.length > 0 && (
              <div className={`mt-4 pt-4 border-t flex flex-wrap gap-2 ${isUser ? 'border-white/10' : 'border-slate-100'}`}>
                {msg.sources.map((s, i) => (
                  <a 
                    key={i} 
                    href={s.uri} 
                    target="_blank" 
                    className={`text-[10px] px-3 py-1.5 rounded-full truncate max-w-[200px] flex items-center gap-2 border transition-colors ${
                      isUser
                      ? 'bg-white/5 hover:bg-white/10 text-blue-300 border-white/5'
                      : 'bg-indigo-50/50 hover:bg-indigo-50 hover:text-indigo-700 text-indigo-600 border-indigo-100/50'
                    }`}
                  >
                    <i className="fas fa-link text-[8px]"></i> {s.title || 'مصدر'}
                  </a>
                ))}
              </div>
            )}
            
            {msg.modelName && (
               <div className={`mt-3 text-[9px] font-mono tracking-widest text-left uppercase ${isUser ? 'opacity-30' : 'text-slate-400 font-bold opacity-75'}`} dir="ltr">
                  {msg.modelName}
               </div>
            )}
          </div>

          {!isUser && msg.type === 'text' && (
            <div className="flex items-center gap-2 px-2 opacity-50 hover:opacity-100 transition-all duration-300">
              <button 
                onClick={() => onSendToResearch && onSendToResearch(msg.content)} 
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 rounded-xl transition-all duration-300 flex items-center gap-1.5 text-[10px] font-bold"
                title={activeAgent?.id === 'ACADEMIC' ? "إرسال هذا المحتوى مباشرة إلى محرر الأبحاث الأكاديمي لتنسيقه" : "إرسال لمنصة التحرير والتنسيق"}
              >
                <i className={activeAgent?.icon || 'fas fa-file-alt'}></i>
                <span>
                  {activeAgent?.id === 'ACADEMIC' 
                    ? 'إرسال لمنصة الأبحاث' 
                    : activeAgent?.id === 'CODER' 
                      ? 'إرسال لمحرر الأكواد' 
                      : activeAgent?.id === 'CREATIVE' || activeAgent?.id === 'VIDEO'
                        ? 'إرسال لمحرر التصاميم'
                        : 'إرسال للمحرر'}
                </span>
              </button>
              
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

              <button onClick={() => navigator.clipboard.writeText(msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="نسخ"><i className="fas fa-copy text-xs"></i></button>
              <button onClick={() => onExport('pdf', `msg-${msg.id}`)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="PDF"><i className="fas fa-file-pdf text-xs"></i></button>
              <button onClick={() => onExport('word', msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="Word"><i className="fas fa-file-word text-xs"></i></button>
              <button onClick={() => onExport('excel', msg.content)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400" title="Excel"><i className="fas fa-file-excel text-xs"></i></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;