import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { IDBPDatabase } from 'idb';

// Polyfill / Safe override for CSSStyleSheet.prototype.cssRules to prevent
// SecurityError: Failed to read the 'cssRules' property from 'CSSStyleSheet': Cannot access rules
// when using libraries like html-to-image with cross-origin stylesheets (e.g. FontAwesome / Google Fonts CDNs)
try {
  if (typeof window !== 'undefined' && typeof CSSStyleSheet !== 'undefined') {
    const originalGet = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules')?.get;
    if (originalGet) {
      Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
        get() {
          try {
            return originalGet.call(this);
          } catch (e) {
            console.warn('Swallowed cross-origin CSSStyleSheet.cssRules access error:', e);
            return [];
          }
        },
        configurable: true,
      });
    }
  }
} catch (err) {
  console.error('Failed to patch CSSStyleSheet.prototype.cssRules', err);
}

import { initDB, getSessions, saveSessions, deleteSession, getSettings, saveSettings } from './services/db';
import { AgentRole, Message, AppSettings, ChatSession } from './types';
import { AGENTS, PROVIDERS_INFO } from './constants';
import { generateTextResponse, generateImage, generateVideo } from './services/geminiService';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import MeshBackground from './components/MeshBackground';
import InstallBanner from './components/InstallBanner';

// New Modular Components
import Header from './components/layout/Header';
import ChatArea from './components/chat/ChatArea';
import ChatInput from './components/chat/ChatInput';
import { PdfEditModal } from './components/PdfEditModal';
import { WordEditModal } from './components/wordEditModal';
import { validateAndFixTable } from './utils/tableValidator';

declare const XLSX: any;

// Helper to render beautiful MS-Word-compatible HTML tables
const renderWordTable = (lines: string[]): string => {
  if (lines.length === 0) return '';
  // Trim trailing/leading space of table cells
  const cleanLines = lines.map(l => l.trim());
  const headerLine = cleanLines[0];
  const headerCellsRaw = headerLine.split('|').slice(1, -1).map(c => c.trim());
  
  let startIndex = 1;
  if (cleanLines.length > 1 && /[-|: ]+/.test(cleanLines[1].trim()) && cleanLines[1].includes('-')) {
    startIndex = 2;
  }
  
  const rowLinesRaw: string[][] = [];
  for (let i = startIndex; i < cleanLines.length; i++) {
    if (!cleanLines[i]) continue;
    const rowCells = cleanLines[i].split('|').slice(1, -1).map(c => c.trim());
    rowLinesRaw.push(rowCells);
  }
  
  const { headers: headerCells, rows: rowLines } = validateAndFixTable(headerCellsRaw, rowLinesRaw);
  
  let html = `<table class="doc-table" border="1" cellspacing="0" cellpadding="8">`;
  html += `<thead><tr>`;
  headerCells.forEach(cell => {
    html += `<th>${cell}</th>`;
  });
  html += `</tr></thead><tbody>`;
  
  rowLines.forEach((cells, idx) => {
    html += `<tr>`;
    cells.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += `</tr>`;
  });
  
  html += `</tbody></table>`;
  return html;
};

const getVerifiedImageUrl = (url: string, altText?: string): string => {
  const defaultFallback = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
  if (!url) return defaultFallback;
  
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('/') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  
  const lower = trimmed.toLowerCase();
  const isBrokenOrPlaceholder = 
    lower.includes('example.com') || 
    lower.includes('placeholder') || 
    lower.includes('invalid') || 
    lower.includes('broken') || 
    lower.includes('link-here') ||
    lower.includes('your-image-url') ||
    !lower.startsWith('http');
    
  if (isBrokenOrPlaceholder) {
    const query = altText ? encodeURIComponent(altText.replace(/[^\p{L}\p{N}, ]/gu, '').trim()) : 'science,academic';
    return `https://images.unsplash.com/featured/800x600/?${query || 'science,laboratory'}`;
  }
  
  return trimmed;
};

const cleanUrlForPreview = (urlStr: string): string => {
  if (!urlStr) return '';
  let url = urlStr.trim();
  try {
    if (url.includes("google.com")) {
      const parsed = new URL(url);
      const target = parsed.searchParams.get("url") || parsed.searchParams.get("q");
      if (target && (target.startsWith("http://") || target.startsWith("https://"))) {
        url = target;
      }
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url);
      const badParams = ["usg", "ved", "sa", "opi", "gs_ssp", "rct", "ei", "client", "cx"];
      let changed = false;
      badParams.forEach(p => {
        if (urlObj.searchParams.has(p)) {
          urlObj.searchParams.delete(p);
          changed = true;
        }
      });
      if (changed) {
        return urlObj.toString();
      }
    }
  } catch (e) {
    // string-based cleaning fallback if URL parsing throws
    try {
      url = url.replace(/[?&](usg|ved|opi|sa|rct)=[^&]+/g, '');
    } catch (err) {}
  }
  return url;
};

const beautifyUrlLabel = (label: string, originalUrl?: string): string => {
  if (!label) return '';
  let decoded = label.trim();
  
  if (decoded.includes('vertexaisearch') || (originalUrl && originalUrl.includes('vertexaisearch'))) {
    return '[رابط البحث]';
  }

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

  if (decoded.length > 35) {
    decoded = decoded.substring(0, 32) + '...';
  }

  return decoded;
};

// Robust markdown parser specific to Microsoft Word HTML encoding constraints
const markdownToWordHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  // Standardize newlines
  let txt = markdown.replace(/\r\n/g, '\n');

  // Enforce automatic academic caption enrichment for any generic/missing image alts:
  const isGenericAlt = (altText: string): boolean => {
    const trimmed = (altText || '').trim();
    return !trimmed || 
      trimmed === 'صورة' || 
      trimmed === 'صورة توضيحية' || 
      trimmed === 'صورة توضيحية علمية' || 
      trimmed === 'صورة توضيحية تم رفعها بواسطة المستخدم' ||
      trimmed === 'صورة مرفقة' ||
      trimmed === 'صورة توضيحية تم رفعها' ||
      !!trimmed.match(/^(image|img|screenshot|picture|photo|unnamed|logo)$/i) ||
      !!trimmed.match(/^IMG_\d+$/i);
  };

  let lastHeading = 'مضمون البحث العلمي';
  const rawLines = txt.split('\n');
  const enrichedLines = rawLines.map(line => {
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      lastHeading = hMatch[2].replace(/[<>&"']/g, '').trim();
    }
    return line.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
      const trimmedAlt = alt.trim();
      if (isGenericAlt(trimmedAlt)) {
        const templates = [
          `مخطط هيكلي وتفصيلي يدعم توثيق وفهم مفاهيم قسم: ${lastHeading}`,
          `شكل بياني وتوضيحي يعكس البعد التحليلي لمبحث: ${lastHeading}`,
          `لوحة توضيحية متكاملة لتبسيط المؤشرات العلمية المرتبطة بـ: ${lastHeading}`,
          `رسم تخطيطي تفصيلي يعزز دقة وموثوقية البحث في سياق: ${lastHeading}`
        ];
        const charSum = lastHeading.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const autoAlt = templates[charSum % templates.length];
        return `![${autoAlt}](${url})`;
      }
      return match;
    });
  });
  txt = enrichedLines.join('\n');

  // Escape raw XML/HTML sensitive chars except we'll compile them to beautiful markup
  txt = txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Protect code blocks
  const codeBlocks: string[] = [];
  txt = txt.replace(/```([\s\S]*?)```/g, (_, code) => {
    const id = `%%CODEBLOCK${codeBlocks.length}%%`;
    codeBlocks.push(code.trim());
    return id;
  });

  // Protect Inline Code
  const inlineCodes: string[] = [];
  txt = txt.replace(/`([^`\n]+)`/g, (_, code) => {
    const id = `%%INLINECODE${inlineCodes.length}%%`;
    inlineCodes.push(code);
    return id;
  });

  // Collect and compile tables
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

  // Convert blockquotes (starting with &gt;)
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

  // Headers (multi-level, with styled executive margins/borders)
  txt = txt.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  txt = txt.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  txt = txt.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  txt = txt.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  txt = txt.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  txt = txt.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');

  // Separators / Horizontal Rules
  txt = txt.replace(/^\s*---\s*$/gm, '<hr />');

  // Multi-level list logic
  const listLines = txt.split('\n');
  let finalLines: string[] = [];
  let ulOpen = false;
  let olOpen = false;

  for (let i = 0; i < listLines.length; i++) {
    const line = listLines[i];
    const uMatch = line.match(/^[\-\*\+]\s+(.+)$/);
    const oMatch = line.match(/^(\d+)\.\s+(.+)$/);

    if (uMatch) {
      if (olOpen) {
        finalLines.push('</ol>');
        olOpen = false;
      }
      if (!ulOpen) {
        finalLines.push('<ul class="doc-list">');
        ulOpen = true;
      }
      finalLines.push(`  <li>${uMatch[1]}</li>`);
    } else if (oMatch) {
      if (ulOpen) {
        finalLines.push('</ul>');
        ulOpen = false;
      }
      if (!olOpen) {
        finalLines.push('<ol class="doc-list-ordered">');
        olOpen = true;
      }
      finalLines.push(`  <li>${oMatch[2]}</li>`);
    } else {
      if (ulOpen) {
        finalLines.push('</ul>');
        ulOpen = false;
      }
      if (olOpen) {
        finalLines.push('</ol>');
        olOpen = false;
      }
      finalLines.push(line);
    }
  }
  if (ulOpen) finalLines.push('</ul>');
  if (olOpen) finalLines.push('</ol>');
  txt = finalLines.join('\n');

  // Images: ![alt](url) -> Detect groups and format into a professional gallery or single figure
  let figureCounter = 1;
  const finalDefaultFallback = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
  
  // Advanced Batch Processor: Finds consecutive images and groups them into a grid
  // Regex matches one or more consecutive image tags possibly separated by whitespace
  const imageGroupRegex = /(?:!\[.*?\]\(.*?\)\s*?){2,}/g;
  txt = txt.replace(imageGroupRegex, (batch) => {
    const images: {alt: string, url: string}[] = [];
    const individualImgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = individualImgRegex.exec(batch)) !== null) {
      images.push({ alt: match[1], url: match[2] });
    }

    if (images.length === 0) return batch;

    let galleryHtml = `<div class="pdf-image-gallery" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 20px auto; max-width: 98%; page-break-inside: avoid;">`;
    images.forEach(img => {
      const verifiedUrl = getVerifiedImageUrl(img.url, img.alt);
      const cleanAlt = img.alt.replace(/"/g, '&quot;');
      const currentNum = figureCounter++;
      
      // Dynamic grid basis: 3 images -> 33%, 4 images -> 48% (2x2), 2 images -> 48%
      let flexBasis = '100%';
      if (images.length === 2 || images.length >= 4) flexBasis = 'calc(50% - 12px)';
      if (images.length === 3) flexBasis = 'calc(33.33% - 12px)';
      
      galleryHtml += `
        <figure style="flex: 1 1 ${flexBasis}; border: 1px solid #e2e8f0; padding: 8px; border-radius: 8px; background: #fff; margin: 0; display: flex; flex-direction: column; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.02);">
          <img crossorigin="anonymous" referrerpolicy="no-referrer" src="${verifiedUrl}" alt="${cleanAlt}" onerror="this.onerror=null;this.src='${finalDefaultFallback}';" style="max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 4px;" />
          <figcaption style="margin-top: 6px; font-size: 8pt; color: #64748b; text-align: center; direction: rtl; line-height: 1.2;">شكل (${currentNum}): ${img.alt}</figcaption>
        </figure>`;
    });
    galleryHtml += `</div>`;
    return galleryHtml;
  });

  // Handle single remaining images that weren't part of a group
  txt = txt.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    const verifiedUrl = getVerifiedImageUrl(url, alt);
    const cleanAlt = alt.replace(/"/g, '&quot;');
    const isSpecialAlt = alt && alt !== 'صورة' && alt !== 'صورة توضيحية علمية' && alt !== 'صورة توضيحية تم رفعها بواسطة المستخدم';
    const currentNum = figureCounter++;
    
    return `<figure class="pdf-document-image-figure" style="margin: 0 0 15px 15px; float: right; text-align: center; page-break-inside: avoid; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; background: #fafafa; max-width: 40%; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
      ${isSpecialAlt ? `<div style="font-weight: bold; color: #4f46e5; margin-bottom: 8px; font-size: 10pt; text-align: right; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; direction: rtl;">شكل (${currentNum}): ${alt}</div>` : ''}
      <img class="pdf-document-image" crossorigin="anonymous" referrerpolicy="no-referrer" src="${verifiedUrl}" alt="${cleanAlt}" onerror="this.onerror=null;this.src='${finalDefaultFallback}';" style="max-width: 100%; max-height: 200px; object-fit: contain; display: block; margin: 0 auto; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);" />
      ${isSpecialAlt ? `<figcaption style="margin-top: 8px; font-size: 8pt; color: #64748b; text-align: center; font-style: italic; line-height: 1.2; direction: rtl;">${alt}</figcaption>` : ''}
    </figure>`;
  });

  // Links: [text](url) -> <a class="pdf-link" href="url" target="_blank">text</a> with cleaned tracking parameters and beautified labels
  txt = txt.replace(/\[([^!\]]+?)\]\((.+?)\)/g, (match, textContent, url) => {
    const cleanedUrl = cleanUrlForPreview(url);
    const beautified = beautifyUrlLabel(textContent, url);
    return `<a class="pdf-link" href="${cleanedUrl}" target="_blank">${beautified}</a>`;
  });

  // Convert any remaining raw URLs into clean pdf-links
  txt = txt.replace(/(^|[\s>])(https?:\/\/[^\s<)\]]+)/g, (match, prefix, url) => {
    let cleanUrl = url;
    let suffix = '';
    // Handle punctuation at the end that shouldn't be part of the URL intuitively
    if (cleanUrl.match(/[.,;،؛]$/)) {
      suffix = cleanUrl.slice(-1);
      cleanUrl = cleanUrl.slice(0, -1);
    }
    
    let displayLabel = '[رابط]';
    try {
      const parsedUrl = new URL(cleanUrl);
      displayLabel = parsedUrl.hostname.replace(/^www\./, '');
      if (cleanUrl.includes('vertexaisearch')) {
        displayLabel = '[رابط البحث]';
      } else if (displayLabel.length > 25) {
        displayLabel = displayLabel.substring(0, 22) + '...';
      }
    } catch(e) {
      displayLabel = cleanUrl.length > 30 ? cleanUrl.substring(0, 27) + '...' : cleanUrl;
    }

    return `${prefix}<a class="pdf-link" href="${cleanUrl}" target="_blank" dir="ltr">${displayLabel}</a>${suffix}`;
  });

  // Bold & Italics
  txt = txt.replace(/\*\*+([^\*\n]+?)\*\*+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  txt = txt.replace(/__+([^\_\n]+?)__+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  txt = txt.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, (_, p) => `<em>${p.trim()}</em>`);
  txt = txt.replace(/(?<!_)_(?!_)([^\_\n]+?)(?<!_)_(?!_)/g, (_, p) => `<em>${p.trim()}</em>`);

  // Group paragraphs
  const blocks = txt.split(/\n\n+/);
  const parsed = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h1') || 
        trimmed.startsWith('<h2') || 
        trimmed.startsWith('<h3') || 
        trimmed.startsWith('<h4') || 
        trimmed.startsWith('<h5') || 
        trimmed.startsWith('<h6') || 
        trimmed.startsWith('<ul') || 
        trimmed.startsWith('<ol') || 
        trimmed.startsWith('<blockquote') || 
        trimmed.startsWith('<hr') || 
        trimmed.startsWith('<table') || 
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<img') ||
        trimmed.startsWith('<a') ||
        trimmed.startsWith('%%TABLEBLOCK') ||
        trimmed.startsWith('%%CODEBLOCK')) {
      return trimmed;
    }
    return `<p class="doc-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
  });
  txt = parsed.join('\n');

  // Restore Inline Code
  txt = txt.replace(/%%INLINECODE(\d+)%%/g, (_, id) => {
    return `<code>${inlineCodes[parseInt(id)]}</code>`;
  });

  // Restore Code Blocks
  txt = txt.replace(/%%CODEBLOCK(\d+)%%/g, (_, id) => {
    return `<pre><code>${codeBlocks[parseInt(id)]}</code></pre>`;
  });

  // Restore Tables
  txt = txt.replace(/%%TABLEBLOCK(\d+)%%/g, (_, id) => {
    return tables[parseInt(id)];
  });

  return txt;
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [db, setDb] = useState<IDBPDatabase<any> | null>(null);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    providers: {
      gemini: { apiKey: '', enabled: true, selectedModel: 'gemini-2.5-flash' },
      openai: { apiKey: '', enabled: false, selectedModel: 'gpt-4o' },
      deepseek: { apiKey: '', enabled: false, selectedModel: 'deepseek-chat' },
      anthropic: { apiKey: '', enabled: false, selectedModel: 'claude-3-5-sonnet-20240620' },
      groq: { apiKey: '', enabled: false, selectedModel: 'llama-3.3-70b-versatile' },
      pollinations: { apiKey: '', enabled: true, selectedModel: 'openai' },
    },
    activeProvider: 'gemini',
    system: { language: 'ar', soundEnabled: true }
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ data: string, mimeType: string }[]>([]);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // PDF Preview and Editor States
  const [editPdfShow, setEditPdfShow] = useState(false);
  const [editPdfContent, setEditPdfContent] = useState('');
  const [editPdfStyle, setEditPdfStyle] = useState<'academic' | 'creative' | 'standard'>('standard');

  // Word Preview and Editor States
  const [editWordShow, setEditWordShow] = useState(false);
  const [editWordContent, setEditWordContent] = useState('');
  const [editWordStyle, setEditWordStyle] = useState<'academic' | 'creative' | 'standard'>('standard');

  // Declare handleNewChat at the top so it's globally accessible
  const handleNewChat = useCallback(() => {
    setInput('');
    setUploadedFiles([]);
    setIsThinking(false);

    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'محادثة جديدة',
      agentId: AgentRole.GENERAL,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSessions(prev => {
      if (prev.length > 0 && prev[0].messages.length === 0 && prev[0].title === 'محادثة جديدة') {
        setActiveSessionId(prev[0].id);
        return prev;
      }
      setActiveSessionId(newId);
      return [newSession, ...prev];
    });
    setSidebarOpen(false);
  }, []);

  // Component initialization

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.error('Service Worker registration failed', err));
    }

    const start = async () => {
      const openedDb = await initDB();
      setDb(openedDb);
      const savedSessions = await getSessions(openedDb);
      if (savedSessions.length > 0) {
        const sorted = [...savedSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSessions(sorted);
        setActiveSessionId(sorted[0].id);
      } else {
        handleNewChat();
      }
      
      const savedSettings = await getSettings(openedDb);
      if (savedSettings) {
        setSettings(savedSettings);
      }
    };
    start();

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      (window as any).promptInstall = e;
      setShowInstallBanner(true);
    });
  }, []);

  useEffect(() => {
    if (!db) return;
    saveSessions(db, sessions);
  }, [sessions, db]);

  useEffect(() => {
    if (!db) return;
    saveSettings(db, settings);
  }, [settings, db]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const activeAgent = useMemo(() => {
    if (!activeSession) return AGENTS[0];
    return AGENTS.find(a => a.id === activeSession.agentId) || AGENTS[0];
  }, [activeSession]);

  const handleSelectAgent = useCallback((agentId: AgentRole) => {
    if (activeSessionId) {
      // If the current active session is completely empty, update its agentId
      const currentSessObj = sessions.find(s => s.id === activeSessionId);
      if (currentSessObj && currentSessObj.messages.length === 0) {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, agentId } : s));
        setSidebarOpen(false);
        return;
      }
    }

    // Check if we already have an empty chat session for this specific agentId
    const existingEmptySession = sessions.find(s => s.agentId === agentId && s.messages.length === 0);
    if (existingEmptySession) {
      setActiveSessionId(existingEmptySession.id);
      setSidebarOpen(false);
      return;
    }

    // Create a brand new session for this agent
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'محادثة جديدة',
      agentId: agentId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, [activeSessionId, sessions]);

  const handleSendMessage = async (textOverride?: string | any) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input;
    const messageText = String(rawText || '');
    if (!messageText.trim() && uploadedFiles.length === 0) return;

    let targetSessionId = activeSessionId;
    let fallbackSession: ChatSession | null = null;

    if (!targetSessionId) {
      const newId = Date.now().toString();
      fallbackSession = {
        id: newId,
        title: messageText.slice(0, 30) || 'محادثة جديدة',
        agentId: activeAgent.id,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      targetSessionId = newId;
      setActiveSessionId(newId);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      type: 'text',
      attachments: uploadedFiles.map(f => f.mimeType)
    };

    if (fallbackSession) {
      fallbackSession.messages.push(userMsg);
      setSessions(prev => [fallbackSession!, ...prev]);
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, userMsg],
            title: s.messages.length === 0 ? messageText.slice(0, 30) : s.title,
            updatedAt: new Date()
          };
        }
        return s;
      }));
    }

    const promptText = messageText;
    setInput('');
    const filesToSend = [...uploadedFiles];
    setUploadedFiles([]);
    setIsThinking(true);

    try {
      const lowerInput = promptText.toLowerCase();
      // If active agent is CREATIVE, default to image request unless user asks for video SPECIFICALLY
      const isImageRequest = (activeAgent.id === AgentRole.CREATIVE && !/(فيديو|video)/gi.test(lowerInput)) || /(ارسم|صورة|تخيل|توليد صورة|صمم صورة|رسم|img|image|draw|paint|generate image|create image)/i.test(lowerInput);
      
      // If active agent is VIDEO, default to video request unless user asks for image/drawing SPECIFICALLY
      const isVideoRequest = (activeAgent.id === AgentRole.VIDEO && !/(ارسم|صورة|تخيل|توليد صورة|صمم صورة|رسم|img|image|draw|paint|generate image)/gi.test(lowerInput)) || /(فيديو|انشئ فيديو|صناعة فيديو|صمم فيديو|video|create video|generate video)/i.test(lowerInput);

      let aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        type: 'text'
      };

      if (isImageRequest) {
        const imagePrompt = promptText.replace(/(ارسم لي|ارسم|صورة لـ|صورة|تخيل|توليد صورة|صمم صورة|رسم|img|image|draw|paint|generate image|create image)\s*/gi, '').trim() || promptText;
        const imageUrl = await generateImage(imagePrompt, settings);
        aiMsg.type = 'image';
        aiMsg.imageUrl = imageUrl;
        aiMsg.content = `تم توليد الصورة بناءً على طلبك: "${imagePrompt}"`;
      } else if (isVideoRequest) {
        const videoPrompt = promptText.replace(/(فيديو لـ|فيديو|انشئ فيديو|صناعة فيديو|صمم فيديو|video|create video|generate video)\s*/gi, '').trim() || promptText;
        const videoUrl = await generateVideo(videoPrompt);
        aiMsg.type = 'video';
        aiMsg.videoUrl = videoUrl;
        aiMsg.content = `تم إنشاء الفيديو: "${videoPrompt}"`;
      } else {
        const currentSessionObj = fallbackSession || sessions.find(s => s.id === targetSessionId);
        const previousMessages = currentSessionObj ? currentSessionObj.messages : [];
        const history = previousMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));
        
        const response = await generateTextResponse(
          promptText,
          activeAgent.id,
          activeAgent.systemInstruction,
          history as any,
          filesToSend,
          settings
        );
        
        aiMsg.content = response.text;
        aiMsg.sources = response.sources;
        aiMsg.modelName = response.modelName;
      }

      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));

    } catch (error: any) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ عذراً، حدث خطأ: ${error.message}`,
        timestamp: new Date(),
        type: 'text'
      };
      setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s));
    } finally {
      setIsThinking(false);
    }
  };

  const detectContentType = (text: string): 'academic' | 'creative' | 'standard' => {
    if (!text) return 'standard';
    const textLower = text.toLowerCase();
    
    // Academic signals
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

    // Creative/beautiful dynamic design signals
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadedFiles(prev => [...prev, { data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = (type: 'word' | 'excel' | 'pdf', target: string) => {
    if (type === 'word') {
      let detectedStyle = detectContentType(target);
      if (activeAgent?.id === AgentRole.ACADEMIC) {
        detectedStyle = 'academic';
      } else if (activeAgent?.id === AgentRole.CREATIVE || activeAgent?.id === AgentRole.VIDEO) {
        detectedStyle = 'creative';
      }
      setEditWordContent(target);
      setEditWordStyle(detectedStyle);
      setEditWordShow(true);
    } else if (type === 'pdf') {
      let detectedStyle = detectContentType(target);
      if (activeAgent?.id === AgentRole.ACADEMIC) {
        detectedStyle = 'academic';
      } else if (activeAgent?.id === AgentRole.CREATIVE || activeAgent?.id === AgentRole.VIDEO) {
        detectedStyle = 'creative';
      }
      setEditPdfContent(target);
      setEditPdfStyle(detectedStyle);
      setEditPdfShow(true);
      return;
      const parsedBody = markdownToWordHtml(target);
      const styleType = detectContentType(target);
      const todayFormatted = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let cssStyles = '';
      let coverHeader = '';
      let fileNamePrefix = 'document';

      const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@400;600;700;900&display=swap');`;

      if (styleType === 'academic') {
        fileNamePrefix = 'academic-research';
        cssStyles = `
          ${fontImport}
          body {
            font-family: 'Tajawal', 'Cairo', Arial, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            margin: 0; padding: 20px;
            direction: rtl;
            text-align: right;
          }
          h1 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 18pt;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 24pt; margin-bottom: 12pt;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            line-height: 1.3;
            text-align: right;
          }
          h2 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 14pt;
            font-weight: bold;
            color: #1e293b;
            margin-top: 20pt; margin-bottom: 10pt;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 6px;
            line-height: 1.3;
            text-align: right;
          }
          h3 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 12pt;
            font-weight: bold;
            color: #334155;
            margin-top: 16pt; margin-bottom: 8pt;
            text-align: right;
          }
          .doc-paragraph {
            font-size: 11pt;
            line-height: 1.8;
            margin-bottom: 14pt;
            color: #1e293b;
            text-align: right;
            direction: rtl;
          }
          strong { color: #000000; font-weight: bold; }
          blockquote {
            margin: 16pt 0;
            padding: 12pt 18pt;
            background-color: #f8fafc;
            border-right: 5px solid #1e3a8a;
            border-left: none;
            color: #334155;
            font-style: italic;
            text-align: right;
            direction: rtl;
          }
          table.doc-table {
            border-collapse: collapse; width: 100%;
            margin-top: 18pt; margin-bottom: 18pt;
            border: 1px solid #94a3b8;
            direction: rtl;
          }
          table.doc-table th {
            background-color: #1e3a8a; color: #ffffff;
            font-weight: bold;
            font-size: 10.5pt; padding: 10.5px;
            border: 1px solid #94a3b8; text-align: right;
          }
          table.doc-table td {
            padding: 10.5px; border: 1px solid #cbd5e1;
            font-size: 10pt; text-align: right; color: #334155;
          }
          table.doc-table tr:nth-child(even) { background-color: #f8fafc; }
          ul.doc-list, ol.doc-list-ordered { margin-bottom: 14pt; padding-right: 28px; text-align: right; direction: rtl; }
          ul.doc-list li, ol.doc-list-ordered li { font-size: 11pt; margin-bottom: 6pt; text-align: right; }
          .pdf-link {
            color: #1e3a8a !important;
            text-decoration: none !important;
            font-size: 8.5pt !important;
            border-bottom: 1px dashed #1e3a8a80 !important;
            background-color: rgba(30, 58, 138, 0.05) !important;
            padding: 1px 4px !important;
            margin: 0 1px !important;
            border-radius: 3px !important;
            display: inline !important;
          }
        `;
        coverHeader = `
          <div style="border-bottom: 4px double #1e3a8a; padding-bottom: 15px; margin-bottom: 30px; text-align: center; direction: rtl;">
            <p style="font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 19pt; font-weight: 900; color: #1e3a8a; margin: 0; border: none; padding: 0;">تقرير بحثي أكاديمي منسّق</p>
            <p style="font-family: 'Tajawal', sans-serif; font-size: 9.5pt; color: #475569; margin: 6px 0 0 0;">تم تنسيق وتوثيق هذا المستند علمياً وتصديره كملف PDF احترافي</p>
          </div>
        `;
      } else if (styleType === 'creative') {
        fileNamePrefix = 'creative-vibrant';
        cssStyles = `
          ${fontImport}
          body {
            font-family: 'Tajawal', 'Cairo', Arial, sans-serif;
            margin: 0; padding: 20px;
            color: #4c0519;
            background-color: #ffffff;
            direction: rtl;
            text-align: right;
          }
          h1 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 20pt;
            font-weight: 900;
            color: #be185d;
            background-color: #fff1f2;
            padding: 12px 16px;
            margin-top: 26pt; margin-bottom: 14pt;
            border-right: 6px solid #f43f5e;
            border-left: none;
            border-radius: 6px;
            line-height: 1.4;
            text-align: right;
          }
          h2 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 16pt;
            font-weight: bold;
            color: #9d174d;
            margin-top: 22pt; margin-bottom: 12pt;
            border-bottom: 2px dashed #fda4af;
            padding-bottom: 6px;
            line-height: 1.4;
            text-align: right;
          }
          h3 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 13.5pt;
            font-weight: bold;
            color: #db2777;
            margin-top: 18pt; margin-bottom: 9pt;
            text-align: right;
          }
          .doc-paragraph {
            font-size: 11.5pt;
            line-height: 1.75;
            margin-bottom: 15pt;
            color: #4c0519;
            text-align: right;
            direction: rtl;
          }
          strong { color: #9d174d; font-weight: bold; background-color: #fff1f2; padding: 2px 5px; border-radius: 3px; }
          blockquote {
            margin: 18pt 0;
            padding: 14pt 20pt;
            background-color: #fff1f2;
            border-right: 5px solid #f43f5e;
            border-left: none;
            color: #9f1239;
            font-style: italic;
            border-radius: 4px;
            text-align: right;
            direction: rtl;
          }
          table.doc-table {
            border-collapse: collapse; width: 100%;
            margin-top: 20pt; margin-bottom: 20pt;
            border: 2px solid #fca5a5;
            direction: rtl;
          }
          table.doc-table th {
            background-color: #f43f5e; color: #ffffff;
            font-weight: bold;
            font-size: 11pt; padding: 12px;
            text-align: right;
          }
          table.doc-table td {
            padding: 11px; border: 1px solid #fecdd3;
            font-size: 10.5pt; text-align: right; color: #881337;
          }
          table.doc-table tr:nth-child(even) { background-color: #fff5f5; }
          ul.doc-list, ol.doc-list-ordered { margin-bottom: 15pt; padding-right: 28px; text-align: right; direction: rtl; }
          ul.doc-list li, ol.doc-list-ordered li { font-size: 11.5pt; margin-bottom: 7pt; color: #4c0519; text-align: right; }
          .pdf-link {
            color: #f43f5e !important;
            text-decoration: none !important;
            font-size: 9pt !important;
            border-bottom: 1px dashed #f43f5e80 !important;
            background-color: rgba(244, 63, 94, 0.05) !important;
            padding: 1px 4px !important;
            margin: 0 1px !important;
            border-radius: 3px !important;
            display: inline !important;
          }
        `;
        coverHeader = `
          <div style="background-color: #fff1f2; border: 2px dashed #fda4af; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center; direction: rtl;">
            <p style="font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 19pt; font-weight: 900; color: #db2777; margin: 0; text-shadow: 1px 1px 2px rgba(190,24,93,0.1);">✨ النص الإبداعي والجميل المنسق</p>
            <p style="font-family: 'Tajawal', sans-serif; font-size: 10pt; color: #e11d48; margin: 6px 0 0 0; font-style: italic;">تم تصدير هذا النص الإبداعي الأنيق كملف PDF احترافي ملوّن</p>
          </div>
        `;
      } else {
        fileNamePrefix = 'document';
        cssStyles = `
          ${fontImport}
          body {
            font-family: 'Tajawal', 'Cairo', Arial, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0; padding: 20px;
            direction: rtl;
            text-align: right;
          }
          h1 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 19pt;
            font-weight: bold;
            color: #312e81;
            margin-top: 22pt; margin-bottom: 11pt;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 6px;
            line-height: 1.3;
            text-align: right;
          }
          h2 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 15pt;
            font-weight: bold;
            color: #1e293b;
            margin-top: 18pt; margin-bottom: 9pt;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            line-height: 1.3;
            text-align: right;
          }
          h3 {
            font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
            font-size: 13pt;
            font-weight: bold;
            color: #334155;
            margin-top: 14pt; margin-bottom: 7pt;
            text-align: right;
          }
          .doc-paragraph {
            font-size: 11pt;
            line-height: 1.65;
            margin-bottom: 12pt;
            color: #334155;
            text-align: right;
            direction: rtl;
          }
          strong { color: #0f172a; font-weight: bold; }
          blockquote {
            margin: 14pt 0; padding: 10pt 16pt;
            background-color: #f8fafc;
            border-right: 4px solid #6366f1;
            border-left: none;
            color: #475569;
            font-style: italic;
            text-align: right;
            direction: rtl;
          }
          table.doc-table {
            border-collapse: collapse; width: 100%;
            margin-top: 16pt; margin-bottom: 16pt;
            border: 1px solid #cbd5e1;
            direction: rtl;
          }
          table.doc-table th {
            background-color: #1e293b; color: #ffffff;
            font-weight: bold;
            font-size: 10.5pt; padding: 10px;
            border: 1px solid #cbd5e1; text-align: right;
          }
          table.doc-table td {
            padding: 10px; border: 1px solid #e2e8f0;
            font-size: 10pt; text-align: right; color: #334155;
          }
          table.doc-table tr:nth-child(even) { background-color: #f8fafc; }
          .pdf-link {
            color: #4f46e5 !important;
            text-decoration: none !important;
            font-size: 8.5pt !important;
            border-bottom: 1px dashed #4f46e580 !important;
            background-color: rgba(79, 70, 229, 0.05) !important;
            padding: 1px 4px !important;
            margin: 0 1px !important;
            border-radius: 3px !important;
            display: inline !important;
          }
        `;
        coverHeader = `
          <div style="border-bottom: 3px double #312e81; padding-bottom: 12px; margin-bottom: 24px; text-align: center; direction: rtl;">
            <p style="font-family: 'Cairo', 'Tajawal', sans-serif; font-size: 16pt; font-weight: bold; color: #312e81; margin: 0;">مستند منسق بالكامل</p>
            <p style="font-family: 'Tajawal', sans-serif; font-size: 9.5pt; color: #64748b; margin: 4px 0 0 0;">تم تصدير المستند الذكي بالكامل كملف PDF منسّق واحترافي</p>
          </div>
        `;
      }

      const tempDiv = document.createElement('div');
      tempDiv.dir = 'rtl';
      tempDiv.style.padding = '30px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.color = '#1e293b';
      tempDiv.style.fontFamily = "'Tajawal', 'Cairo', Arial, sans-serif";
      tempDiv.innerHTML = `
        <style>
          ${cssStyles}
          /* Additional elements style normalization */
          pre {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            padding: 14px !important;
            border-radius: 8px !important;
            margin: 15pt 0 !important;
            white-space: pre-wrap !important;
            direction: ltr !important;
            text-align: left !important;
          }
          code {
            font-family: Consolas, Monaco, 'Courier New', monospace !important;
            font-size: 9.5pt !important;
            color: #be185d !important;
            background-color: #fff1f2 !important;
            padding: 2px 4px !important;
            border-radius: 4px !important;
            direction: ltr !important;
            display: inline-block !important;
          }
          ul, ol {
            padding-right: 22px !important;
            text-align: right !important;
            direction: rtl !important;
          }
          li {
            margin-bottom: 8px !important;
            line-height: 1.6 !important;
            text-align: start !important;
          }
        </style>
        <div dir="auto" style="text-align: start;">
          ${coverHeader}
          <div id="pdf-body-content" dir="auto" style="text-align: start;">
            ${parsedBody}
          </div>
          <div dir="auto" style="text-align: center; font-size: 8.5pt; color: #64748b; margin-top: 45px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-family: 'Tajawal', sans-serif;">
            تاريخ التصدير: ${todayFormatted} | الوكيل الذكي المتكامل - AI Multi-Agent Hub
          </div>
        </div>
      `;
      
      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `${fileNamePrefix}-${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          letterRendering: false, 
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      const html2pdf = (window as any).html2pdf;
      if (html2pdf) {
        html2pdf().from(tempDiv).set(opt).save();
      } else {
        console.error('html2pdf.js is not loaded');
        alert('عذراً، مكتبة تصدير PDF قيد التحميل، يرجى المحاولة بعد لحظات.');
      }
    } else if (type === 'excel') {
      if (typeof XLSX === 'undefined') return;
      
      let dataAOA: any[][] = [];
      
      // Professional Table Extraction
      if (target.includes('|')) {
        const lines = target.split('\n');
        lines.forEach(line => {
          if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            if (line.includes('---')) return; // skip separating lines (e.g. |---|---|)
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            dataAOA.push(cells);
          }
        });
      }
      
      // Tab/Comma parsing fallback
      if (dataAOA.length === 0) {
        const lines = target.split('\n');
        lines.forEach(line => {
          const l = line.trim();
          if (l === '') return;
          if (l.includes('\t')) {
            dataAOA.push(l.split('\t').map(c => c.trim()));
          } else if (l.includes(',')) {
            dataAOA.push(l.split(',').map(c => c.trim()));
          } else {
            dataAOA.push([l]);
          }
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(dataAOA.length > 0 ? dataAOA : [[target]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `academic-table-${Date.now()}.xlsx`);
    }
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, opening in new tab instead:', err);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full max-w-[100vw] text-slate-800 font-sans overflow-hidden relative selection:bg-amber-500/20 antialiased">
      <MeshBackground />

      <Sidebar 
        activeSessionId={activeSessionId}
        sessions={sessions}
        onSelectSession={(id) => {
          if (id === null) {
            handleNewChat();
          } else {
            setActiveSessionId(id);
          }
          setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteSession={async (id, e) => {
          e.stopPropagation();
          setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            if (activeSessionId === id) {
              if (next.length > 0) {
                setActiveSessionId(next[0].id);
              } else {
                setTimeout(() => handleNewChat(), 0);
              }
            }
            return next;
          });
          if (db) {
            try {
              await deleteSession(db, id);
            } catch (err) {
              console.error("Failed to delete chat from IDB:", err);
            }
          }
        }}
        onOpenSettings={() => setShowSettings(true)}
        activeProviderName={PROVIDERS_INFO[settings.activeProvider].name}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeAgentId={activeAgent.id}
        onSelectAgent={handleSelectAgent}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#070b1c]/45 backdrop-blur-xl relative transition-all duration-350 overflow-hidden">
        <Header 
          onToggleSidebar={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
          activeAgent={activeAgent}
          isThinking={isThinking}
          onSelectAgent={handleSelectAgent}
          onGoHome={handleNewChat}
          onRefresh={() => window.location.reload()}
        />

        <ChatArea 
          messages={activeSession?.messages || []}
          activeAgent={activeAgent}
          isThinking={isThinking}
          onExport={handleExport}
          onDownloadMedia={downloadMedia}
          onSuggestionClick={(s) => handleSendMessage(s)}
          onSelectAgent={handleSelectAgent}
          hasActiveSession={!!activeSessionId}
          onResetChat={() => {
            if (!activeSessionId) return;
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
            setIsThinking(false);
          }}
        />

        <ChatInput 
          input={input}
          setInput={setInput}
          onSend={handleSendMessage}
          isThinking={isThinking}
          uploadedFiles={uploadedFiles}
          onFileDelete={(idx) => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
          onFileUpload={handleFileUpload}
        />
      </main>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
      />

      <PdfEditModal
        isOpen={editPdfShow}
        onClose={() => setEditPdfShow(false)}
        initialContent={editPdfContent}
        initialStyle={editPdfStyle}
      />

      <WordEditModal
        isOpen={editWordShow}
        onClose={() => setEditWordShow(false)}
        initialContent={editWordContent}
        initialStyle={editWordStyle}
      />

      {showInstallBanner && <InstallBanner onInstall={() => (window as any).promptInstall?.prompt()} onDismiss={() => setShowInstallBanner(false)} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);