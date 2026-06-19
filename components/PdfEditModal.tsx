import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import { validateAndFixTable } from '../utils/tableValidator';

interface PdfEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  initialStyle: 'academic' | 'creative' | 'standard';
}

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

// Beautiful table parsing
const formatInlineMarkdown = (text: string): string => {
  if (!text) return '';
  let res = text;
  // Links: [text](url) -> <a class="pdf-link" href="url" target="_blank">text</a> with decoded and beautiful labels
  res = res.replace(/\[([^!\]]+?)\]\((.+?)\)/g, (match, textContent, url) => {
    const beautified = beautifyUrlLabel(textContent, url);
    return `<a class="pdf-link" href="${url}" target="_blank">${beautified}</a>`;
  });
  // Bold: **text** or __text__
  res = res.replace(/\*\*+([^\*\n]+?)\*\*+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  res = res.replace(/__+([^\_\n]+?)__+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  // Italic: *text* or _text_
  res = res.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, (_, p) => `<em>${p.trim()}</em>`);
  res = res.replace(/(?<!_)_(?!_)([^\_\n]+?)(?<!_)_(?!_)/g, (_, p) => `<em>${p.trim()}</em>`);
  // Inline code: `code`
  res = res.replace(/`([^`\n]+)`/g, (_, p) => `<code>${p}</code>`);
  return res;
};

const renderWordTable = (lines: string[]): string => {
  if (lines.length === 0) return '';
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
    html += `<th>${formatInlineMarkdown(cell)}</th>`;
  });
  html += `</tr></thead><tbody>`;
  
  rowLines.forEach((cells) => {
    html += `<tr>`;
    cells.forEach(cell => {
      html += `<td>${formatInlineMarkdown(cell)}</td>`;
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

// Help convert markdown to visual HTML tags with specifiers
const markdownToWordHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  // Strip cover-data
  let txt = markdown.replace(/<div\s+id="cover-data"[^>]*>([\s\S]*?)<\/div>/gi, '');
  
  // Standardize newlines
  txt = txt.replace(/\r\n/g, '\n');

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

  txt = txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const codeBlocks: string[] = [];
  txt = txt.replace(/```([\s\S]*?)```/g, (_, code) => {
    const id = `%%CODEBLOCK${codeBlocks.length}%%`;
    codeBlocks.push(code.trim());
    return id;
  });

  const inlineCodes: string[] = [];
  txt = txt.replace(/`([^`\n]+)`/g, (_, code) => {
    const id = `%%INLINECODE${inlineCodes.length}%%`;
    inlineCodes.push(code);
    return id;
  });

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
  txt = txt.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  txt = txt.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');

  txt = txt.replace(/^\s*---\s*$/gm, '<hr />');
  
  // Support dynamic page breaks [فاصل_صفحات] or [page_break]
  txt = txt.replace(/\[(فاصل_صفحات|page_break)\]/g, '<div class="pdf-page-break" data-page-break="true"></div>');

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
    const isSpecialAlt = alt && alt !== 'صورة' && alt !== 'صورة توضيحية تم رفعها بواسطة المستخدم' && alt !== 'صورة توضيحية علمية';
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

  txt = txt.replace(/\*\*+([^\*\n]+?)\*\*+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  txt = txt.replace(/__+([^\_\n]+?)__+/g, (_, p) => `<strong>${p.trim()}</strong>`);
  txt = txt.replace(/(?<!\*)\*(?!\*)([^\*\n]+?)(?<!\*)\*(?!\*)/g, (_, p) => `<em>${p.trim()}</em>`);
  txt = txt.replace(/(?<!_)_(?!_)([^\_\n]+?)(?<!_)_(?!_)/g, (_, p) => `<em>${p.trim()}</em>`);
  
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
        trimmed.startsWith('%%TABLEBLOCK') ||
        trimmed.startsWith('%%CODEBLOCK')) {
      return trimmed;
    }
    return `<p class="doc-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
  });
  txt = parsed.join('\n');

  txt = txt.replace(/%%INLINECODE(\d+)%%/g, (_, id) => {
    return `<code>${inlineCodes[parseInt(id)]}</code>`;
  });

  txt = txt.replace(/%%CODEBLOCK(\d+)%%/g, (_, id) => {
    return `<pre><code>${codeBlocks[parseInt(id)]}</code></pre>`;
  });

  txt = txt.replace(/%%TABLEBLOCK(\d+)%%/g, (_, id) => {
    return tables[parseInt(id)];
  });

  return txt;
};

export const PdfEditModal: React.FC<PdfEditModalProps> = ({ isOpen, onClose, initialContent, initialStyle }) => {
  // Master document content state (HTML processed or edit-updated)
  const [markdownContent, setMarkdownContent] = useState(initialContent);
  const [customHtmlBody, setCustomHtmlBody] = useState('');
  const [initialHtmlForEdit, setInitialHtmlForEdit] = useState('');
  const liveHtmlRef = useRef('');
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(0.75);
  const [visualPageCount, setVisualPageCount] = useState<number>(1);

  // Advanced Visual Settings Panel Toggle Component
  const [showAdvancedStyles, setShowAdvancedStyles] = useState(false);

  // Dynamic Stylings State variables
  const [currentThemeId, setCurrentThemeId] = useState<string>(initialStyle);
  const [fontFamily, setFontFamily] = useState<string>('Tajawal');
  const [baseFontSize, setBaseFontSize] = useState<number>(11.5); // pt
  const [headingFontSize, setHeadingFontSize] = useState<number>(18.5); // pt
  const [lineHeight, setLineHeight] = useState<number>(1.75);
  const [paragraphSpacing, setParagraphSpacing] = useState<number>(8); // pt
  const [autoFitPages, setAutoFitPages] = useState<number | ''>('');
  const [pageMargin, setPageMargin] = useState<number>(16); // mm
  
  const [h1Color, setH1Color] = useState<string>('#1e3a8a');
  const [bodyTextColor, setBodyTextColor] = useState<string>('#1e293b');
  const [pageBgColor, setPageBgColor] = useState<string>('#ffffff');
  const [accentColor, setAccentColor] = useState<string>('#3b82f6');
  const [tableHeaderBg, setTableHeaderBg] = useState<string>('#1e3a8a');
  const [blockquoteBg, setBlockquoteBg] = useState<string>('#f8fafc');
  
  const [showBorderFrame, setShowBorderFrame] = useState<boolean>(false);
  const [showClassicBlackFrame, setShowClassicBlackFrame] = useState<boolean>(false);
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const [customFooterText, setCustomFooterText] = useState<string>('');
  
  const [customTitle, setCustomTitle] = useState<string>('التقرير الذكي المنسّق والمدقق');
  const [customSubtitle, setCustomSubtitle] = useState<string>('تم تنسيق وتصدير هذا المستند علمياً بأعلى دقة وتصميم جمالي');

  // Interactive layouts & professional editorial features
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showAppendixImages, setShowAppendixImages] = useState<boolean>(false);

  // Auto-fit zoom on mount and resize for PDF
  useEffect(() => {
    if (isOpen) {
      const handleResize = () => {
        const container = document.getElementById('pdf-preview-scroll-container');
        if (container) {
          const containerWidth = container.clientWidth - 48;
          const a4WidthMm = pageOrientation === 'portrait' ? 210 : 297;
          const a4WidthPx = a4WidthMm * 3.78;
          let fitZoom = containerWidth / a4WidthPx;
          
          // Default to at least 0.75 as per user request
          fitZoom = Math.min(Math.max(0.75, fitZoom), 1.1);
          setZoom(parseFloat(fitZoom.toFixed(2)));
        }
      };

      const timeoutId = setTimeout(handleResize, 100);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timeoutId);
      };
    }
  }, [isOpen, pageOrientation]);
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [borderStyle, setBorderStyle] = useState<string>('double');
  const [columnCount, setColumnCount] = useState<number>(1);
  const [textAlignment, setTextAlignment] = useState<string>('justify');
  const [activeSetupTab, setActiveSetupTab] = useState<'content' | 'presets' | 'typography' | 'colors' | 'layout' | 'cover' | 'images'>('content');
  const [showAutoTOC, setShowAutoTOC] = useState<boolean>(initialStyle === 'academic');

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

  // Cover Page Customizer States
  const [showCoverPage, setShowCoverPage] = useState<boolean>(false);
  const [coverCustomLogoBase64, setCoverCustomLogoBase64] = useState<string | null>(null);
  const [coverUniversity, setCoverUniversity] = useState<string>('');
  const [coverFaculty, setCoverFaculty] = useState<string>('');
  const [coverDepartment, setCoverDepartment] = useState<string>('');
  const [coverTitle, setCoverTitle] = useState<string>('');
  const [coverSubtitle, setCoverSubtitle] = useState<string>('');
  const [coverDoctor, setCoverDoctor] = useState<string>('');
  const [coverStudent, setCoverStudent] = useState<string>('');
  const [coverStudentId, setCoverStudentId] = useState<string>('');
  const [coverCourse, setCoverCourse] = useState<string>('');
  const [coverYear, setCoverYear] = useState<string>('');
  
  // Design elements styling for the cover page
  const [coverLayout, setCoverLayout] = useState<'center' | 'classic' | 'striped' | 'formal' | 'minimalist'>('center');
  const [coverLogoType, setCoverLogoType] = useState<'crest' | 'grad' | 'atom' | 'book' | 'none' | 'custom'>('crest');
  const [coverMetadataPlacement, setCoverMetadataPlacement] = useState<'right' | 'left' | 'split'>('right');
  const [coverDivider, setCoverDivider] = useState<'none' | 'thin' | 'double' | 'fancy'>('thin');
  const [activeCoverPresetId, setActiveCoverPresetId] = useState<string>('custom');

  // Ref container to hold live editings directly within the preview page
  const contentEditableRef = useRef<HTMLDivElement>(null);

  // States for advanced table formatting and page arrangement tools
  const [tableStriped, setTableStriped] = useState<boolean>(true);
  const [tableCellPadding, setTableCellPadding] = useState<'small' | 'medium' | 'large'>('medium');
  const [tableBorderType, setTableBorderType] = useState<'full' | 'horizontal' | 'light' | 'none'>('full');

  // Dynamic font options
  const arabicFonts = [
    { id: 'Tajawal', name: 'خط تجول (عصري)' },
    { id: 'Cairo', name: 'خط كيرو (رسمي وجريء)' },
    { id: 'Amiri', name: 'خط أميري (أكاديمي/أثري)' },
    { id: 'Almarai', name: 'خط المراعي (سلس ومقروء)' },
    { id: 'Changa', name: 'خط شانغا (واضح للمقالات)' },
    { id: 'Lemonada', name: 'خط ليمونادا (إبداعي فني)' }
  ];

  // Elite Predefined Theme Presets
  const stylePresets = [
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
        accentColor: '#7f1d1d', // Crimson / Harvard red
        tableHeaderBg: '#7f1d1d',
        blockquoteBg: '#fef2f2',
        baseFontSize: 13,
        headingFontSize: 24,
        lineHeight: 1.9,
        pageMargin: 24, // Wide margin for academic comments
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
        h1Color: '#0c2340', // Oxford Blue
        bodyTextColor: '#1f2937',
        pageBgColor: '#fcfdfd',
        accentColor: '#0c2340',
        tableHeaderBg: '#0c2340',
        blockquoteBg: '#f0f4f8',
        baseFontSize: 12.5,
        headingFontSize: 23,
        lineHeight: 1.85,
        pageMargin: 22,
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
        accentColor: '#0284c7', // Professional Sky Blue
        tableHeaderBg: '#1e293b',
        blockquoteBg: '#f8fafc',
        baseFontSize: 11.5,
        headingFontSize: 20,
        lineHeight: 2.0, // Double line spacing signature of APA
        pageMargin: 25.4, // Standard 1 inch (25.4mm)
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
        h1Color: '#044e11', // Islamic Deep Green
        bodyTextColor: '#111827',
        pageBgColor: '#fbf8f3', // Golden Parchment
        accentColor: '#c29d38', // Calligraphy Gold
        tableHeaderBg: '#056316',
        blockquoteBg: '#f4fbf5',
        baseFontSize: 13.5,
        headingFontSize: 24,
        lineHeight: 1.95,
        pageMargin: 20,
        showBorderFrame: false,
        showClassicBlackFrame: true,
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
        h1Color: '#00629b', // IEEE Blue
        bodyTextColor: '#111827',
        pageBgColor: '#ffffff',
        accentColor: '#00629b',
        tableHeaderBg: '#00629b',
        blockquoteBg: '#f0f7fc',
        baseFontSize: 10,
        headingFontSize: 18,
        lineHeight: 1.6,
        pageMargin: 15,
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
        h1Color: '#451a03', // Deep wood brown
        bodyTextColor: '#1a0c02',
        pageBgColor: '#faf7f2', // Rich parchment
        accentColor: '#b45309', // Classic Gold/Amber
        tableHeaderBg: '#78350f',
        blockquoteBg: '#fffbeb',
        baseFontSize: 13,
        headingFontSize: 23,
        lineHeight: 1.8,
        pageMargin: 22,
        showBorderFrame: false,
        showClassicBlackFrame: true,
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
        h1Color: '#112233', // Gov dark navy
        bodyTextColor: '#1e293b',
        pageBgColor: '#f8fafc',
        accentColor: '#0f766e', // Teal / Integrity Green
        tableHeaderBg: '#0f766e',
        blockquoteBg: '#f0fdfa',
        baseFontSize: 11.5,
        headingFontSize: 20,
        lineHeight: 1.75,
        pageMargin: 18,
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
        h1Color: '#312e81', // Techno Indigo
        bodyTextColor: '#0f172a',
        pageBgColor: '#ffffff',
        accentColor: '#4f46e5',
        tableHeaderBg: '#312e81',
        blockquoteBg: '#f5f3ff',
        baseFontSize: 11,
        headingFontSize: 19,
        lineHeight: 1.7,
        pageMargin: 15,
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
        showBorderFrame: false,
        showClassicBlackFrame: true,
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

  // Apply predefined preset values
  const applyPreset = (presetId: string) => {
    const found = stylePresets.find(p => p.id === presetId);
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
      setParagraphSpacing((found.theme as any).paragraphSpacing || 8);
      setPageMargin(found.theme.pageMargin);
      setShowBorderFrame(found.theme.showBorderFrame);
      setShowClassicBlackFrame((found.theme as any).showClassicBlackFrame || false);
      setCustomTitle(found.theme.customTitle);
      setCustomSubtitle(found.theme.customSubtitle);
      
      // Load optional fields gracefully with defaults
      setPageOrientation(found.theme.pageOrientation as any || 'portrait');
      setFontWeight(found.theme.fontWeight || 'normal');
      setBorderStyle(found.theme.borderStyle || 'double');
      setColumnCount(found.theme.columnCount || 1);
      setTextAlignment(found.theme.textAlignment || 'justify');
    }
  };

  // Helper functions for advanced image editing, replacement, and insertion in the PDF
  const handleReplaceImageUrl = (oldUrl: string, newUrl: string, oldAlt: string, newAlt: string) => {
    if (!oldUrl) return;
    
    // Escape specific regex characters in order to safely target the markdown
    const escapedOldUrl = oldUrl.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedOldAlt = oldAlt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`!\\[${escapedOldAlt}\\]\\(${escapedOldUrl}\\)`, 'g');
    
    const updatedMarkdown = markdownContent.replace(regex, `![${newAlt}](${newUrl})`);
    setMarkdownContent(updatedMarkdown);
    
    // Regenerate and update compiled HTML
    const compiled = markdownToWordHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    setInitialHtmlForEdit(compiled);
  };

  const handleDeleteImage = (url: string, alt: string) => {
    const escapedOldUrl = url.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedOldAlt = alt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`!\\[${escapedOldAlt}\\]\\(${escapedOldUrl}\\)`, 'g');
    
    const updatedMarkdown = markdownContent.replace(regex, '');
    setMarkdownContent(updatedMarkdown);
    
    const compiled = markdownToWordHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    setInitialHtmlForEdit(compiled);
    
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
    
    const compiled = markdownToWordHtml(updatedMarkdown);
    setCustomHtmlBody(compiled);
    setInitialHtmlForEdit(compiled);
    
    // Clear custom url states
    setImgCustomUrl('');
    setImgAltInput('');
  };

  // Synchronize dynamic elements initially and on model opens
  
  useEffect(() => {
    if (initialContent) {
      // Create a temporary element to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = initialContent;
      const dataDiv = tempDiv.querySelector('#cover-data');
      if (dataDiv) {
        setCoverUniversity(dataDiv.getAttribute('data-university') || '');
        setCoverFaculty(dataDiv.getAttribute('data-faculty') || '');
        setCoverDepartment(dataDiv.getAttribute('data-department') || '');
        setCoverStudent(dataDiv.getAttribute('data-student') || '');
        setCoverStudentId(dataDiv.getAttribute('data-studentid') || '');
        setCoverDoctor(dataDiv.getAttribute('data-doctor') || '');
        setCoverCourse(dataDiv.getAttribute('data-course') || '');
      }
    }
  }, [initialContent]);

  useEffect(() => {
    if (isOpen) {
      setMarkdownContent(initialContent);
      const compiledHtml = markdownToWordHtml(initialContent);
      setCustomHtmlBody(compiledHtml);
      setInitialHtmlForEdit(compiledHtml);
      liveHtmlRef.current = compiledHtml;
      setFileName(`مستند_معدل_${Date.now()}`);
      applyPreset(initialStyle);

      // Auto-extract Title & Subtitle from the generated research report
      if (initialContent) {
        const lines = initialContent.split('\n');
        // Look for the main markdown heading (H1)
        const h1Line = lines.find(line => line.trim().startsWith('# '));
        let extractedTitle = '';
        if (h1Line) {
          extractedTitle = h1Line.replace(/^#\s+/, '').trim();
          // Remove bold markdown asterisks or underscores if any
          extractedTitle = extractedTitle.replace(/\*\*+/g, '').replace(/__+/g, '');
        }

        const lowerContent = (initialContent + ' ' + extractedTitle).toLowerCase();
        const isBiology = lowerContent.includes('تكاثر') || lowerContent.includes('أحياء') || lowerContent.includes('خلوي') || lowerContent.includes('asexual') || lowerContent.includes('biology') || lowerContent.includes('اللاجنسي');

        if (isBiology || extractedTitle.includes('التكاثر') || extractedTitle.includes('أحياء') || extractedTitle.includes('بيولوجيا')) {
          setCoverUniversity('جامعة العلوم التطبيقية');
          setCoverFaculty('كلية العلوم الطبيعية');
          setCoverDepartment('قسم الأحياء');
          
          if (extractedTitle) {
            // Check if it's the specific topic
            if (extractedTitle.includes('التكاثر اللاجنسي')) {
              setCoverTitle('التكاثر اللاجنسي: آلياته، أنواعه وعملياته');
              setCoverSubtitle('أطروحة بحثية متميزة ومنسقة استكمالاً لمتطلبات لجان الجودة والتدقيق بقسم الأحياء');
              setCoverCourse('التكاثر اللاجنسي وآلياته');
            } else {
              setCoverTitle(extractedTitle);
              setCoverSubtitle('بحث علمي متكامل استكمالاً لمتطلبات لجان التدقيق والجودة بالجامعة');
              setCoverCourse('علم الأحياء العام');
            }
          } else {
            setCoverTitle('التكاثر اللاجنسي: آلياته، أنواعه وعملياته');
            setCoverSubtitle('أطروحة بحثية متميزة ومنسقة استكمالاً لمتطلبات لجان الجودة والتدقيق بقسم الأحياء');
            setCoverCourse('علم الأحياء العام والتكاثر');
          }
        } else {
          // If other general topic, auto-populate beautifully too!
          if (extractedTitle) {
            setCoverTitle(extractedTitle);
            
            // Look for a subtitle or a first substantial sentence
            const sentenceMatch = lines.find(line => line.trim() && !line.trim().startsWith('#') && line.trim().length > 15);
            if (sentenceMatch) {
              const cleanSentence = sentenceMatch.replace(/\*\*+/g, '').replace(/__+/g, '').trim();
              setCoverSubtitle(cleanSentence.length > 90 ? cleanSentence.substring(0, 90) + '...' : cleanSentence);
            } else {
              setCoverSubtitle('أطروحة بحثية منسقة ومحكّمة وعلمية');
            }
            setCoverCourse(`مقرر ${extractedTitle.substring(0, 30)}`);
          }
        }
      }
    }
  }, [initialContent, initialStyle, isOpen]);

  // Synchronize back if the raw markdown textarea edited
  const handleMarkdownChange = (val: string) => {
    setMarkdownContent(val);
    const compiled = markdownToWordHtml(val);
    setCustomHtmlBody(compiled);
    setInitialHtmlForEdit(compiled);
    liveHtmlRef.current = compiled;
  };

  // Helper to inject pre-formatted markdown syntax or rich tables into raw content textarea
  const insertMarkdownText = (syntax: string) => {
    const textarea = document.getElementById('pdf-raw-markdown-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after  = text.substring(end, text.length);
      const newContent = before + syntax + after;
      setMarkdownContent(newContent);
      handleMarkdownChange(newContent);
      
      // refocus and update cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + syntax.length;
      }, 50);
    } else {
      const newContent = markdownContent + '\n' + syntax;
      setMarkdownContent(newContent);
      handleMarkdownChange(newContent);
    }
  };

  // Handle direct inline edits inside the paper preview
  const handleInlineInput = (e: React.FormEvent<HTMLDivElement>) => {
    const updatedHtml = e.currentTarget.innerHTML;
    liveHtmlRef.current = updatedHtml;
    // We do NOT update customHtmlBody state here because updating state triggers global re-renders on EVERY single keystroke.
    // By keeping it only in the ref, browser layout runs at 100% native FPS which guarantees a light, instant, and ultra-smooth typing experience.
  };

  // ---------------------------------------------------------------------------
  // LIVE PREVIEW PAGINATION EFFECT
  // Ensures that even inside the 1-sheet content editable preview, the text is sliced cleanly over the A4 gaps and number of pages is correctly scaled
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const paginatePreview = () => {
      const container = contentEditableRef.current;
      const exportElement = document.getElementById('pdf-export-element');
      if (!container || !exportElement) return;

      const isPortrait = pageOrientation === 'portrait';
      // Use exact A4 96ppi width for unscaled height baseline
      const a4WidthPx = isPortrait ? 794 : 1123;
      const a4Ratio = isPortrait ? 297/210 : 210/297;
      
      // We must calculate the actual visual unscaled pixel boundaries
      // The wrapper itself is scaled by `zoom`, but all internals are just scaled natively by CSS transforming outwards.
      // So relative coordinates naturally cancel out the zoom effect when compared within the same unscaled tree!
      
      // Calculate true A4 element height excluding React zooms. 
      const trueA4Height = a4WidthPx * a4Ratio; 
      
      // Gap must match our visual UI representation exactly
      const paddingPx = 50; 
      const wrapperRect = exportElement.getBoundingClientRect();
      const exportWidth = wrapperRect.width / zoom;
      const a4HeightPxCalc = exportWidth * a4Ratio;

      let currentShift = 0;
      const originalMargins = new Map<HTMLElement, string>();
      const children = Array.from(container.children) as HTMLElement[];

      // Phase 1: Reset margins from previous pagination runs so we get true natural positions
      children.forEach(child => {
        const stored = child.getAttribute('data-original-mt');
        if (stored !== null) {
           child.style.marginTop = stored;
        } else {
           child.setAttribute('data-original-mt', window.getComputedStyle(child).marginTop || '0');
        }
      });
      
      // Let layout recalculate in Phase 2
      const positions = children.map(child => {
         const rect = child.getBoundingClientRect();
         return {
            child,
            // Extract the zoom out of the mathematical bound calculations
            relativeTop: (rect.top - wrapperRect.top) / zoom,
            relativeBottom: (rect.bottom - wrapperRect.top) / zoom,
            height: rect.height / zoom
         };
      });

      // Gap size corresponds to visual page separation in the UI
      const visualGap = 40; 
      const effectivePageStep = a4HeightPxCalc + visualGap;
      
      // Bottom bounds inside the white A4 page
      const maxNormalBottom = a4HeightPxCalc - paddingPx - 20; // Normal boundary for page break
      const tolerancePx = 65; // Tolerance explicitly requested by user (approx 2 lines!) to prevent blank pages

      // Phase 3: Push intersecting elements dynamically with smart widow/orphan heading constraints
      positions.forEach((item, index) => {
         // Apply accumulated shifts
         const top = item.relativeTop + currentShift;
         const bottom = item.relativeBottom + currentShift;
         
         const topPage = Math.floor(top / effectivePageStep);
         
         const pageNormalEnd = topPage * effectivePageStep + maxNormalBottom;
         const pageAbsoluteEnd = topPage * effectivePageStep + a4HeightPxCalc - 5; // Do not bleed into grey empty space
         
         const tag = item.child.tagName ? item.child.tagName.toLowerCase() : '';
         const isHeading = tag.match(/^h[1-6]$/);
         const isTable = tag === 'table' || item.child.querySelector('table') !== null;
         const isImage = tag === 'figure' || tag === 'img' || item.child.querySelector('img') !== null;
         
         const remainingSpace = pageNormalEnd - top;
         let shouldPushDueToOrphans = false;
         
         if (remainingSpace > 0) {
             if (isHeading && remainingSpace < 130) {
                 shouldPushDueToOrphans = true;
             } else if (isImage && remainingSpace < 160) {
                 shouldPushDueToOrphans = true;
             } else if (isTable && remainingSpace < 140) {
                 shouldPushDueToOrphans = true;
             } else if (remainingSpace < 95 && item.height > remainingSpace) {
                 // Regular paragraph heading or start of a block that won't fit elegantly
                 shouldPushDueToOrphans = true;
             }
         }
         
         if ((bottom > pageNormalEnd && item.height < maxNormalBottom) || shouldPushDueToOrphans) {
             const isLastItem = index === positions.length - 1;
             
             // If we're pushing explicitly to avoid orphans, we always shift. Otherwise, check tolerance
             if (!shouldPushDueToOrphans && (bottom <= pageNormalEnd + tolerancePx || isLastItem) && bottom <= pageAbsoluteEnd) {
                 // Tolerated overflow into the padding area! No margin shifted.
             } else {
                 // Slicing logic: Must push to the next page!
                 const targetTop = (topPage + 1) * effectivePageStep + paddingPx;
                 const shiftAmount = Math.max(0, targetTop - top);
                 
                 const currentMt = parseFloat(item.child.getAttribute('data-original-mt') || '0');
                 item.child.style.marginTop = `${currentMt + shiftAmount}px`;
                 
                 currentShift += shiftAmount;
             }
         }
      });

      // Finally, set the wrapper to have the exact height and track total visual pages rendered
      const finalContainerHeight = ((container.getBoundingClientRect().height) / zoom);
      const totalEstimatedPages = Math.max(1, Math.ceil(finalContainerHeight / effectivePageStep));
      setVisualPageCount(showCoverPage ? totalEstimatedPages + 1 : totalEstimatedPages);
    };

    // Execute efficiently using MutationObserver to track DOM inner height and structure changes
    const observer = new MutationObserver(() => {
       // Debounce slightly to prevent typing jitter
       requestAnimationFrame(paginatePreview);
    });

    if (contentEditableRef.current) {
       observer.observe(contentEditableRef.current, { childList: true, subtree: true, characterData: true });
    }

    // Trigger initially
    const timer = setTimeout(paginatePreview, 150);

    return () => {
       observer.disconnect();
       clearTimeout(timer);
    };
  }, [isOpen, initialHtmlForEdit, customHtmlBody, pageOrientation, zoom, showCoverPage]);

  // ---------------------------------------------------------------------------
  // AUTO-FIT MAGIC LOOP (DISABLED TO PREVENT INFINITE OSCILLATION AND "AW SNAP" CRASH)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Disabled automatically reactive loop since it oscillates and crashes the browser.
    // To truly fix this, it should be an isolated hook or manual calculation without state ping-ponging.
  }, [autoFitPages, visualPageCount, isOpen]);

  if (!isOpen) return null;

  // Helper calculations for custom table styles
  const tablePaddingValue = tableCellPadding === 'small' ? '5px 7px' : tableCellPadding === 'large' ? '13px 15px' : '9px 11px';
  const tableBorderValue = tableBorderType === 'none' ? 'border: none !important;'
    : tableBorderType === 'horizontal' ? `border-top: 1px solid ${accentColor}35 !important; border-bottom: 1px solid ${accentColor}35 !important; border-left: none !important; border-right: none !important;`
    : tableBorderType === 'light' ? `border: 1px solid ${bodyTextColor}15 !important;`
    : `border: 1px solid ${accentColor}25 !important;`;

  // Render CSS variables dynamically based on user controls (Fonts are statically cached in index.html for high performance)
  const dynamicCss = `
    .preview-container-pane {
      font-family: '${fontFamily}', 'Tajawal', sans-serif !important;
      color: ${bodyTextColor} !important;
      background-color: ${pageBgColor} !important;
      padding: ${pageMargin}mm !important;
      box-sizing: border-box !important;
      min-height: ${pageOrientation === 'portrait' ? '297mm' : '210mm'} !important;
      position: relative !important;
      direction: rtl !important;
      text-align: ${textAlignment === 'justify' ? 'justify' : textAlignment} !important;
      text-align-last: start !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease !important;
      ${showClassicBlackFrame ? `border: 4.5px double #111111 !important; border-radius: 0px !important;` : showBorderFrame ? `border: 4.5px ${borderStyle} ${accentColor} !important; border-radius: 4px !important;` : ''}
    }
    
    .preview-container-pane h1 {
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
    
    .preview-container-pane h2 {
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
    
    .preview-container-pane h3 {
      font-family: '${fontFamily}', sans-serif !important;
      font-size: ${(headingFontSize * 0.72).toFixed(1)}pt !important;
      font-weight: 700 !important;
      color: ${h1Color} !important;
      margin-top: 14pt !important; 
      margin-bottom: 8pt !important;
      text-align: right !important;
    }

    .preview-container-pane h4, .preview-container-pane h5, .preview-container-pane h6 {
      font-family: '${fontFamily}', sans-serif !important;
      color: ${h1Color} !important;
      text-align: right !important;
      font-weight: bold !important;
    }
    
    .preview-container-pane p, .preview-container-pane .doc-paragraph {
      font-size: ${baseFontSize}pt !important;
      font-weight: ${fontWeight === 'light' ? '300' : fontWeight === 'medium' ? '500' : fontWeight === 'bold' ? '700' : fontWeight === 'black' ? '900' : '400'} !important;
      line-height: ${lineHeight} !important;
      margin-bottom: ${paragraphSpacing}pt !important;
      color: ${bodyTextColor} !important;
      text-align: ${textAlignment === 'justify' ? 'justify' : textAlignment} !important;
      text-align-last: start !important;
      word-wrap: break-word !important;
    }
    
    .preview-container-pane a, .preview-container-pane .pdf-link {
      color: ${accentColor} !important;
      text-decoration: none !important;
      font-weight: 700 !important;
      font-size: 8.5pt !important;
      border-bottom: 1px dashed ${accentColor}80 !important;
      background-color: ${accentColor}08 !important;
      padding: 1px 4px !important;
      margin: 0 1px !important;
      border-radius: 4px !important;
      word-break: break-all !important;
      cursor: pointer !important;
      display: inline !important;
      transition: all 0.15s ease !important;
    }
    
    .preview-container-pane a:hover, .preview-container-pane .pdf-link:hover {
      background-color: ${accentColor}15 !important;
      border-bottom-style: solid !important;
    }
    
    .preview-container-pane strong { 
      color: ${h1Color} !important; 
      font-weight: 800 !important; 
    }
    
    .preview-container-pane blockquote {
      margin: 16pt 0 !important; 
      padding: 11pt 16pt !important;
      background-color: ${blockquoteBg} !important;
      border-right: 5px solid ${accentColor} !important;
      border-left: none !important;
      color: ${bodyTextColor}e0 !important;
      font-style: italic !important;
      text-align: right !important;
      border-radius: 4px !important;
    }
    
    .preview-container-pane table.doc-table {
      border-collapse: collapse !important; 
      width: 100% !important;
      margin-top: ${Math.floor(paragraphSpacing * 1.5)}pt !important; 
      margin-bottom: ${Math.floor(paragraphSpacing * 1.5)}pt !important;
      border: ${tableBorderType === 'none' ? 'none' : tableBorderType === 'light' ? `1px solid ${bodyTextColor}20` : `1px solid ${accentColor}60`} !important;
      direction: rtl !important;
    }
    
    .preview-container-pane table.doc-table th {
      background-color: ${tableHeaderBg} !important; 
      color: #ffffff !important;
      font-weight: bold !important;
      font-size: ${(baseFontSize * 0.96).toFixed(1)}pt !important; 
      padding: ${tablePaddingValue} !important;
      border: ${tableBorderType === 'none' ? 'none' : tableBorderType === 'light' ? `1px solid ${bodyTextColor}20` : `1px solid ${accentColor}60`} !important; 
      text-align: right !important;
    }
    
    .preview-container-pane table.doc-table td {
      padding: ${tablePaddingValue} !important; 
      ${tableBorderValue}
      font-size: ${(baseFontSize * 0.95).toFixed(1)}pt !important; 
      text-align: right !important; 
      color: ${bodyTextColor} !important;
    }

    ${tableStriped ? `
    .preview-container-pane table.doc-table tbody tr:nth-child(even),
    #live-editable-pdf-body table.doc-table tbody tr:nth-child(even) {
      background-color: ${accentColor}0a !important;
    }
    ` : ''}

    .editable-cover-text {
      text-align: right !important;
      display: inline-block !important;
    }

    .editable-cover-text:empty:before {
      content: attr(data-placeholder) !important;
      opacity: 0.4 !important;
      color: ${bodyTextColor}80 !important;
      pointer-events: none !important;
    }

    /* Prevent stacked/wrapped text (كلمة تحت كلمة) on critical inputs */
    .editable-cover-text[data-cover-field="student"],
    .editable-cover-text[data-cover-field="studentId"],
    .editable-cover-text[data-cover-field="doctor"],
    .editable-cover-text[data-cover-field="year"],
    .editable-cover-text[data-cover-field="university"],
    .editable-cover-text[data-cover-field="faculty"],
    .editable-cover-text[data-cover-field="department"] {
      white-space: nowrap !important;
      display: inline-block !important;
      word-break: keep-all !important;
      min-width: 60px !important;
    }
    
    .preview-container-pane table.doc-table tr:nth-child(even) { 
      background-color: ${blockquoteBg}60 !important; 
    }
    
    .preview-container-pane ul.doc-list, .preview-container-pane ol.doc-list-ordered { 
      margin-bottom: ${paragraphSpacing + 2}pt !important; 
      padding-right: 28px !important; 
      text-align: right !important; 
      direction: rtl !important; 
    }
    
    .preview-container-pane ul.doc-list li, .preview-container-pane ol.doc-list-ordered li { 
      font-size: ${baseFontSize}pt !important; 
      margin-bottom: ${(paragraphSpacing / 2).toFixed(1)}pt !important; 
      line-height: ${lineHeight} !important;
      text-align: right !important; 
      color: ${bodyTextColor} !important;
    }

    .preview-container-pane pre {
      background-color: #0f172a !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      padding: 14px !important;
      border-radius: 8px !important;
      margin: 15pt 0 !important;
      white-space: pre-wrap !important;
      direction: ltr !important;
      text-align: left !important;
    }

    .preview-container-pane code {
      font-family: Consolas, Monaco, monospace !important;
      font-size: ${(baseFontSize * 0.85).toFixed(1)}pt !important;
      color: #be185d !important;
      background-color: rgba(244, 63, 94, 0.08) !important;
      padding: 2px 5px !important;
      border-radius: 4px !important;
    }

    #live-editable-pdf-body, #printed-html-body {
      column-count: ${columnCount} !important;
      column-gap: 22px !important;
      column-rule: ${columnCount > 1 ? `1px dashed ${accentColor}35` : 'none'} !important;
    }
  `;

  const todayFormatted = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  // Compile static headers to show inside PDF printing
  const compiledCoverHeader = showHeader ? `
    <div style="border-bottom: 3.5px double ${accentColor}; padding-bottom: 16px; margin-bottom: 28px; text-align: center; direction: rtl;">
      <p style="font-family: '${fontFamily}', sans-serif; font-size: 20pt; font-weight: 900; color: ${h1Color}; margin: 0; padding: 0;">${customTitle}</p>
      <p style="font-family: '${fontFamily}', sans-serif; font-size: 10pt; color: ${bodyTextColor}aa; margin: 6px 0 0 0;">${customSubtitle}</p>
    </div>
  ` : '';

  // Helper to compile the vector logos for the academic cover page
  const getCoverLogoSvg = (logoType: string, accentClr: string, mainClr: string) => {
    if (logoType === 'custom' && coverCustomLogoBase64) return `<img src="${coverCustomLogoBase64}" width="70" height="70" style="max-height: 100%; max-width: 100%; object-fit: contain; margin: 0 auto; display: block;" />`;
    switch (logoType) {
      case 'crest':
        return `<svg width="70" height="70" viewBox="0 0 64 64" fill="none" style="display:block; margin:0 auto;"><path d="M32 4 L50 14 V32 C50 44 42 54 32 58 C22 54 14 44 14 32 V14 Z" fill="${accentClr}20" stroke="${accentClr}" stroke-width="2" /><path d="M32 9 L46 17 V31 C46 41 39 49 32 53 C25 49 18 41 18 31 V17 Z" stroke="${accentClr}" stroke-width="1" stroke-opacity="0.5" /><circle cx="32" cy="28" r="7" stroke="${mainClr}" stroke-width="2" fill="none" /><path d="M22 28 A10 10 0 0 0 42 28" stroke="${mainClr}" stroke-width="1.5" fill="none" /><path d="M27 38 L32 43 L37 38" stroke="${accentClr}" stroke-width="2" fill="none" stroke-linecap="round" /></svg>`;
      case 'grad':
        return `<svg width="70" height="70" viewBox="0 0 64 64" fill="none" style="display:block; margin:0 auto;"><path d="M32 52 C43 52 48 44 48 34 V18 L32 10 L16 18 V34 C16 44 21 52 32 52 Z" fill="${accentClr}10" stroke="${accentClr}" stroke-width="2" /><path d="M12 24 L32 15 L52 24 L32 33 Z" fill="${mainClr}" stroke="${mainClr}" stroke-width="1.5" /><path d="M20 27.5 V38 C20 44 26 48 32 48 C38 48 44 44 44 38 V27.5" stroke="${mainClr}" stroke-width="1.5" fill="none" /><path d="M46 24.5 V35 C46 35.5 47 36 48 36 C49 36 50 35.5 50 35 V24.5" stroke="${accentClr}" stroke-width="1.5" fill="none" /></svg>`;
      case 'atom':
        return `<svg width="70" height="70" viewBox="0 0 64 64" fill="none" style="display:block; margin:0 auto;"><ellipse cx="32" cy="32" rx="26" ry="9" stroke="${accentClr}" stroke-width="2" transform="rotate(30 32 32)" /><ellipse cx="32" cy="32" rx="26" ry="9" stroke="${accentClr}" stroke-width="2" transform="rotate(-30 32 32)" /><ellipse cx="32" cy="32" rx="26" ry="9" stroke="${mainClr}" stroke-width="1.5" transform="rotate(90 32 32)" /><circle cx="32" cy="32" r="6" fill="${mainClr}" /><circle cx="45" cy="24" r="3" fill="${accentClr}" /><circle cx="19" cy="40" r="3" fill="${accentClr}" /><circle cx="32" cy="58" r="3" fill="${mainClr}" /></svg>`;
      case 'book':
        return `<svg width="70" height="70" viewBox="0 0 64 64" fill="none" style="display:block; margin:0 auto;"><path d="M32 10 C21 10 14 14 14 14 V48 C14 48 21 44 32 44 C43 44 50 48 50 48 V14 C50 14 43 10 32 10 Z" fill="${accentClr}15" stroke="${accentClr}" stroke-width="2" /><path d="M32 10 V44" stroke="${accentClr}" stroke-width="2" /><path d="M18 19 H28 M18 25 H28 M18 31 H28 M18 37 H26" stroke="${mainClr}" stroke-width="1.5" stroke-linecap="round" /><path d="M46 19 H36 M46 25 H36 M46 31 H36 M46 37 H38" stroke="${mainClr}" stroke-width="1.5" stroke-linecap="round" /><path d="M32 44 V54 M26 50 H38" stroke="${mainClr}" stroke-width="2" stroke-linecap="round" /></svg>`;
      default:
        return '';
    }
  };

  // Helper to compile elegant title/metadata dividers
  const getCoverDividerHtml = (type: string, color: string) => {
    switch (type) {
      case 'thin':
        return `<div style="height: 1.5px; background: ${color}; width: 140px; margin: 25px auto; border-radius: 4px;"></div>`;
      case 'double':
        return `<div style="height: 5px; border-top: 1.5px solid ${color}; border-bottom: 1.5px solid ${color}; width: 170px; margin: 25px auto;"></div>`;
      case 'fancy':
        return `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 25px 0; direction: rtl;">
            <div style="height: 1px; background: linear-gradient(to left, transparent, ${color}); flex: 1; max-width: 120px;"></div>
            <div style="font-size: 8pt; color: ${color}; letter-spacing: 2px;">✦   ✦   ✦</div>
            <div style="height: 1px; background: linear-gradient(to right, transparent, ${color}); flex: 1; max-width: 120px;"></div>
          </div>
        `;
      default:
        return `<div style="height: 25px;"></div>`;
    }
  };

  // Generate complete Cover Page HTML structure matching the user's customized design
  const getCoverPageHtml = () => {
    const finalTitle = coverTitle.trim() || customTitle || '';
    const finalSubtitle = coverSubtitle.trim() || customSubtitle || '';
    const logoSvg = getCoverLogoSvg(coverLogoType, accentColor, h1Color);
    const dividerHtml = getCoverDividerHtml(coverDivider, accentColor);
    
    let innerContent = '';

    switch (coverLayout) {
      case 'center': {
        innerContent = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 50px 45px; box-sizing: border-box; text-align: center; background-color: ${pageBgColor};">
            <!-- Top Header (Dynamic, Aligned) -->
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 2px solid ${accentColor}18; padding-bottom: 15px; direction: rtl; box-sizing: border-box;">
              <div style="text-align: right; line-height: 1.4; font-family: '${fontFamily}', sans-serif;">
                <span style="font-size: 11pt; color: ${h1Color}; font-weight: 850; display: block;">${coverUniversity || 'المؤسسة الأكاديمية'}</span>
                <span style="font-size: 9.5pt; color: ${bodyTextColor}cc; font-weight: 700; display: block; margin-top: 1px;">توثيق أكاديمي رقمي</span>
              </div>
              ${coverLogoType !== 'none' ? `
                <div style="padding: 6px; background-color: ${pageBgColor}; border: 1.5px solid ${accentColor}20; border-radius: 50%; width: 55px; height: 55px; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
                  ${logoSvg.replace('width="70" height="70"', 'width="40" height="40"')}
                </div>
              ` : '<div></div>'}
              <div style="text-align: left; font-family: '${fontFamily}', sans-serif; font-size: 9.5pt; color: ${bodyTextColor}be; font-weight: bold;">
                <span>رمز البحث: AC-${coverStudentId.slice(-4) || '9283'}</span>
              </div>
            </div>
            
            <!-- Mid Title Section (Perfectly Centered) -->
            <div style="max-width: 92%; margin: 30px auto; width: 100%; text-align: center;">
              <span style="background-color: ${accentColor}10; color: ${accentColor}; font-size: 9.5pt; font-weight: 900; padding: 5px 16px; border-radius: 30px; display: inline-block; margin-bottom: 16px; font-family: '${fontFamily}', sans-serif; border: 1px solid ${accentColor}20; text-transform: uppercase;">أطروحة بحثية منسقة ومحكمة وعلمية</span>
              <h1 style="font-family: '${fontFamily}', sans-serif; font-size: 26pt; font-weight: 950; color: ${h1Color}; margin: 0; line-height: 1.45; text-align: center !important; border-bottom: none !important; padding-bottom: 0 !important;"><span contenteditable="plaintext-only" data-cover-field="title" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="عنوان البحث" style="min-width: 40px; display: inline-block;">${finalTitle}</span></h1>
              ${dividerHtml}
              <p style="font-family: '${fontFamily}', sans-serif; font-size: 11.5pt; color: ${bodyTextColor}b0; margin: 12px 0 0 0; line-height: 1.55; font-weight: 500; text-align: center !important;"><span contenteditable="plaintext-only" data-cover-field="subtitle" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="العنوان الفرعي" style="min-width: 40px; display: inline-block;">${finalSubtitle}</span></p>
            </div>
            
            <!-- Bottom Section: Splitted Left/Right Card Structure (As requested) -->
            <div style="display: flex; gap: 20px; align-items: stretch; margin-top: 25px; width: 100%; direction: rtl; box-sizing: border-box;">
              <!-- Right card (الجانب الأيمن): Academic Sponsor (University/College/Dept) -->
              <div style="flex: 1; min-width: 0; background: linear-gradient(135deg, ${accentColor}08, ${accentColor}02); border: 1.5px solid ${accentColor}15; border-right: 5px solid ${accentColor}; border-radius: 14px; padding: 20px 24px; text-align: right; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.01); box-sizing: border-box;">
                <span style="font-family: '${fontFamily}', sans-serif; font-size: 9pt; color: ${accentColor}; font-weight: 900; display: block; margin-bottom: 8px; letter-spacing: 0.5px;">🏫 الكلية والقسم العلمي:</span>
                <strong style="font-family: '${fontFamily}', sans-serif; font-size: 12pt; color: ${h1Color}; font-weight: 950; display: block; line-height: 1.5;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                <span style="font-family: '${fontFamily}', sans-serif; font-size: 10pt; color: ${bodyTextColor}cc; font-weight: 800; display: block; margin-top: 6px;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                <span style="font-family: '${fontFamily}', sans-serif; font-size: 9pt; color: ${bodyTextColor}90; font-weight: 500; display: block; margin-top: 4px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
              </div>
              
              <!-- Left card (الجانب الأيسر): Student, Student ID, Doctor, Date -->
              <div style="flex: 1.1; min-width: 0; background: linear-gradient(135deg, ${bodyTextColor}05, transparent); border: 1.5px solid ${bodyTextColor}10; border-left: 5px solid ${h1Color}; border-radius: 14px; padding: 20px 24px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.01); box-sizing: border-box;">
                <div style="margin-bottom: 12px;">
                  <span style="font-family: '${fontFamily}', sans-serif; font-size: 9pt; color: ${accentColor}; font-weight: 900; display: block; margin-bottom: 5px;">👤 مقدم من الطالب المتفوق:</span>
                  <strong style="font-family: '${fontFamily}', sans-serif; font-size: 12pt; color: ${h1Color}; font-weight: 950; display: block;"><span contenteditable="plaintext-only" data-cover-field="student" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الاسم" style="min-width: 40px; display: inline-block;">${coverStudent}</span></strong>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 9.5pt; color: ${bodyTextColor}cc; font-weight: bold; display: block; margin-top: 3.5px;">الرقم الجامعي: <span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></span>
                </div>
                
                <div style="border-top: 1px dashed ${bodyTextColor}15; padding-top: 10px;">
                  <span style="font-family: '${fontFamily}', sans-serif; font-size: 8.5pt; color: ${bodyTextColor}80; display: inline-block; margin-left: 6px; font-weight: bold;">🎓 تحت إشراف:</span>
                  <span style="font-family: '${fontFamily}', sans-serif; font-size: 10pt; color: ${bodyTextColor}; font-weight: bold;">أ.د. / <span contenteditable="plaintext-only" data-cover-field="doctor" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="دكتور/أستاذ المادة" style="min-width: 40px; display: inline-block;">${coverDoctor}</span></span>
                </div>
                
                <div style="margin-top: 8px; font-size: 8.5pt; color: ${bodyTextColor}80; font-weight: bold;">
                  <span>📅 تاريخ التقديم: <span contenteditable="plaintext-only" data-cover-field="year" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="السنة الدراسية" style="min-width: 40px; display: inline-block;">${coverYear}</span></span>
                </div>
              </div>
            </div>
          </div>
        `;
        break;
      }
      case 'striped': {
        innerContent = `
          <div style="display: flex; height: 100%; width: 100%; direction: rtl; box-sizing: border-box; overflow: hidden; background-color: ${pageBgColor};">
            <!-- Left Side Accent Stripe -->
            <div style="width: 26%; background: linear-gradient(135deg, ${accentColor}, ${h1Color}); display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 45px 15px; box-sizing: border-box; color: #ffffff; text-align: center;">
              <div>
                <div style="background: rgba(255,255,255,0.15); border-radius: 50%; padding: 12px; display: inline-block; margin-bottom: 20px; border: 1.5px solid rgba(255,255,255,0.25);">
                  ${logoSvg.replace('width="70" height="70"', 'width="48" height="48"').replace(accentColor, '#ffffff').replace(h1Color, '#ffffff')}
                </div>
                <div style="font-family: '${fontFamily}', sans-serif; font-size: 10.5pt; font-weight: bold; line-height: 1.45; letter-spacing: 0.5px; opacity: 0.95;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></div>
              </div>
              <div style="writing-mode: vertical-rl; transform: rotate(180deg); opacity: 0.8; font-family: '${fontFamily}', sans-serif; font-size: 9pt; letter-spacing: 3px; font-weight: bold; text-transform: uppercase;">
                نموذج تفصيلي للبحث العلمي المنسق
              </div>
              <div style="font-family: '${fontFamily}', sans-serif; font-size: 8.5pt; opacity: 0.65; font-weight: bold;">الرقم الجامعي: <span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></div>
            </div>
            
            <!-- Right Main Elements Content -->
            <div style="width: 74%; padding: 45px 35px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background-color: ${pageBgColor};">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid ${accentColor}20; padding-bottom: 14px; margin-bottom: 35px; width: 100%;">
                  <div style="text-align: right; width: 50%;">
                    <div style="font-family: '${fontFamily}', sans-serif; font-size: 11.5pt; font-weight: bold; color: ${h1Color};"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></div>
                    <div style="font-family: '${fontFamily}', sans-serif; font-size: 9.5pt; color: ${bodyTextColor}80; margin-top: 3px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></div>
                  </div>
                  <div style="text-align: left; width: 50%; font-family: '${fontFamily}', sans-serif; font-size: 9.5pt; color: ${accentColor}; font-weight: 800; line-height: 1.5; direction: rtl;">
                    مستند دراسي أكاديمي<br/>
                    <b><span contenteditable="plaintext-only" data-cover-field="course" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="المقرر" style="min-width: 40px; display: inline-block;">${coverCourse}</span></b>
                  </div>
                </div>
                
                <div style="margin-top: 40px; text-align: right;">
                  <span style="background-color: ${accentColor}12; color: ${accentColor}; font-size: 9.5pt; font-weight: bold; padding: 6px 14px; border-radius: 30px; display: inline-block; margin-bottom: 18px; font-family: '${fontFamily}', sans-serif; border: 1px solid ${accentColor}20;">دراسة نوعية محققة</span>
                  <p style="font-family: '${fontFamily}', sans-serif; font-size: 24pt; font-weight: 900; color: ${h1Color}; margin: 0; line-height: 1.4; max-width: 95%;"><span contenteditable="plaintext-only" data-cover-field="title" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="عنوان البحث" style="min-width: 40px; display: inline-block;">${finalTitle}</span></p>
                  <p style="font-family: '${fontFamily}', sans-serif; font-size: 11.5pt; color: ${bodyTextColor}a0; margin: 12px 0 0 0; line-height: 1.6; font-weight: 500;"><span contenteditable="plaintext-only" data-cover-field="subtitle" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="العنوان الفرعي" style="min-width: 40px; display: inline-block;">${finalSubtitle}</span></p>
                  
                  <div style="margin-top: 15px; text-align: right; width: 100%;">
                    ${dividerHtml.replace('margin: 25px auto', 'margin: 15px 0')}
                  </div>
                </div>
              </div>
              
              <!-- Bottom Partition Cards: Aligned custom left and right splits -->
              <div style="display: flex; gap: 15px; align-items: stretch; width: 100%; direction: rtl; box-sizing: border-box;">
                <div style="flex: 1; background: ${accentColor}06; border-right: 4px solid ${accentColor}; border-radius: 10px; padding: 14px 18px; text-align: right; box-sizing: border-box;">
                  <span style="font-size: 8.5pt; color: ${accentColor}; font-weight: bold; display: block; margin-bottom: 4px;">📂 الهيئة العلمية:</span>
                  <strong style="font-size: 10.5pt; color: ${h1Color}; display: block;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                  <span style="font-size: 9.5pt; color: ${bodyTextColor}be; display: block; margin-top: 3px;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                  <span style="font-size: 8.5pt; color: ${bodyTextColor}90; display: block; margin-top: 2px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
                </div>
                <div style="flex: 1.2; background: ${bodyTextColor}04; border-right: 4px solid ${h1Color}; border-radius: 10px; padding: 14px 18px; text-align: right; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <span style="font-size: 8.5pt; color: ${h1Color}; font-weight: bold; display: block; margin-bottom: 4px;">✍️ مقدم من الطالب المتفوق:</span>
                    <strong style="font-size: 11pt; color: ${bodyTextColor}; display: block;"><span contenteditable="plaintext-only" data-cover-field="student" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الاسم" style="min-width: 40px; display: inline-block;">${coverStudent}</span></strong>
                    <span style="font-size: 8.5pt; color: ${bodyTextColor}90; font-family: 'JetBrains Mono', monospace;">الرقم الجامعي: <span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></span>
                  </div>
                  <div style="margin-top: 8px; font-size: 8.5pt; color: ${bodyTextColor}a0; border-top: 1px dashed ${bodyTextColor}15; padding-top: 6px;">
                    <span><b>المشرف الأكاديمي:</b> أ.د. <span contenteditable="plaintext-only" data-cover-field="doctor" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="دكتور/أستاذ المادة" style="min-width: 40px; display: inline-block;">${coverDoctor}</span></span>
                    <span style="display: block; font-size: 8pt; color: ${bodyTextColor}80; margin-top: 2px;">التسليم: <span contenteditable="plaintext-only" data-cover-field="year" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="السنة الدراسية" style="min-width: 40px; display: inline-block;">${coverYear}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        break;
      }
      case 'formal': {
        innerContent = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 50px 45px; box-sizing: border-box; background-color: ${pageBgColor};">
            <!-- Top Header (3 Columns partitioned beautifully) -->
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-bottom: 2.5px solid ${accentColor}; padding-bottom: 15px; direction: rtl; box-sizing: border-box;">
              <!-- Right Side (الجانب الأيمن): University/College/Dept -->
              <div style="width: 38%; text-align: right; font-family: '${fontFamily}', sans-serif; line-height: 1.5; color: ${bodyTextColor}cc; font-size: 9.5pt;">
                <strong style="font-size: 11.5pt; color: ${h1Color}; font-weight: 900; display: block; margin-bottom: 3px;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                <span style="display: block; font-weight: bold;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                <span style="display: block; opacity: 0.85; font-size: 8.5pt;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
              </div>
              
              <!-- Center Side: Official Emblem (Aligned Center) -->
              <div style="width: 24%; display: flex; justify-content: center; align-items: center;">
                ${coverLogoType !== 'none' ? `
                  <div style="padding: 10px; background-color: #ffffff; border: 1.5px solid ${accentColor}30; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.02); box-sizing: border-box;">
                    ${logoSvg.replace('width="70" height="70"', 'width="48" height="48"')}
                  </div>
                ` : '<div style="height: 15px;"></div>'}
              </div>
              
              <!-- Left Side: Formal Document Metadata (Aligned Left) -->
              <div style="width: 38%; text-align: left; font-family: '${fontFamily}', sans-serif; line-height: 1.5; color: ${bodyTextColor}cc; font-size: 9.5pt; direction: rtl;">
                <strong style="font-size: 10.5pt; color: ${accentColor}; font-weight: 800; display: block; margin-bottom: 3px; text-align: left;">وزارة التعليم العالي والبحث العلمي</strong>
                <span style="display: block; opacity: 0.9; text-align: left;"><b>المقرر الدراسي:</b> <span contenteditable="plaintext-only" data-cover-field="course" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="المقرر" style="min-width: 40px; display: inline-block;">${coverCourse}</span></span>
                <span style="display: block; opacity: 0.8; font-size: 9pt; text-align: left; font-family: 'JetBrains Mono', monospace;"><b>الرقم الرقمي للتقرير:</b> #${coverStudentId.slice(-4)}</span>
              </div>
            </div>
            
            <!-- Mid Section: Title (Centered) -->
            <div style="text-align: center; margin: 40px 0; max-width: 90%; margin-left: auto; margin-right: auto; width: 100%;">
              <div style="font-size: 11pt; color: ${accentColor}; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 12px; font-family: '${fontFamily}', sans-serif; text-transform: uppercase;">تقرير دراسي أكاديمي منسّق ومحكّم ومعتمد</div>
              <h1 style="font-family: '${fontFamily}', sans-serif; font-size: 25pt; font-weight: 950; color: ${h1Color}; margin: 0; line-height: 1.4; border-bottom: none !important; padding-bottom: 0 !important; text-align: center !important;"><span contenteditable="plaintext-only" data-cover-field="title" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="عنوان البحث" style="min-width: 40px; display: inline-block;">${finalTitle}</span></h1>
              ${dividerHtml}
              <p style="font-family: '${fontFamily}', sans-serif; font-size: 11.5pt; color: ${bodyTextColor}aa; margin: 12px 0 0 0; line-height: 1.6; font-weight: 500; text-align: center !important;"><span contenteditable="plaintext-only" data-cover-field="subtitle" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="العنوان الفرعي" style="min-width: 40px; display: inline-block;">${finalSubtitle}</span></p>
            </div>
            
            <div style="text-align: center; margin-bottom: 15px; font-family: '${fontFamily}', sans-serif; color: ${bodyTextColor}c0; font-size: 10.5pt; font-weight: bold;">
              بحث متكامل مقدّم استكمالاً لمتطلبات لجان التدقيق والجودة بالجامعة
            </div>
            
            <!-- Bottom Grid (Partitioned with beautiful side-by-side formal cards) -->
            <div style="display: flex; gap: 15px; width: 100%; direction: rtl; box-sizing: border-box;">
              <!-- Right card (الجانب الأيمن): Academic Info (University/College/Dept) -->
              <div style="flex: 1; background-color: #fcfdfe; border: 1.5px solid ${accentColor}25; border-radius: 8px; padding: 15px; text-align: right; box-sizing: border-box;">
                <span style="font-size: 9pt; color: ${accentColor}; font-weight: bold; display: block; border-bottom: 1px solid ${accentColor}15; padding-bottom: 4px; margin-bottom: 8px;">🏛️ جهة الانتماء الأكاديمي:</span>
                <strong style="font-size: 11pt; color: ${h1Color}; display: block; line-height: 1.5;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                <span style="font-size: 9.5pt; color: ${bodyTextColor}be; display: block; margin-top: 5px; font-weight: bold;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                <span style="font-size: 9pt; color: ${bodyTextColor}90; display: block; margin-top: 3px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
              </div>
              
              <!-- Left card (الجانب الأيسر): Student ID, Student, Doctor Advisor, Submission date -->
              <div style="flex: 1.2; background-color: #fcfdfe; border: 1.5px solid ${accentColor}25; border-radius: 8px; padding: 15px; text-align: right; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <span style="font-size: 9pt; color: ${accentColor}; font-weight: bold; display: block; border-bottom: 1px solid ${accentColor}15; padding-bottom: 4px; margin-bottom: 8px;">🎓 هيئة الطلاب والإشراف:</span>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <span style="font-size: 9.5pt; color: ${bodyTextColor}; font-weight: 800;">مقدم من الطالب المتفوق: <span contenteditable="plaintext-only" data-cover-field="student" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الاسم" style="min-width: 40px; display: inline-block;">${coverStudent}</span></span>
                    <span style="font-size: 8.5pt; color: ${bodyTextColor}90; font-family: 'JetBrains Mono', monospace; font-weight: bold; background: #eee; padding: 1px 6px; border-radius: 4px;">ج/ <span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></span>
                  </div>
                  <div style="margin-top: 6px;">
                    <span style="font-size: 9.5pt; color: ${bodyTextColor};"><b>تحت إشراف الأستاذ:</b> أ.د. <span contenteditable="plaintext-only" data-cover-field="doctor" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="دكتور/أستاذ المادة" style="min-width: 40px; display: inline-block;">${coverDoctor}</span></span>
                  </div>
                </div>
                <div style="margin-top: 10px; font-size: 8.5pt; color: ${bodyTextColor}80; text-align: left; font-weight: bold;">
                  <span>تاريخ التقديم والطلب: <span contenteditable="plaintext-only" data-cover-field="year" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="السنة الدراسية" style="min-width: 40px; display: inline-block;">${coverYear}</span></span>
                </div>
              </div>
            </div>
          </div>
        `;
        break;
      }
      case 'classic': {
        innerContent = `
          <div style="height: 100%; border: 4px double ${h1Color}; padding: 40px 35px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; background-color: ${pageBgColor}; position: relative;">
            <!-- Outer Royal Frame corner ornaments -->
            <div style="position: absolute; top: 12px; right: 12px; font-weight: bold; font-size: 16pt; color: ${accentColor}90; select-none">⚜</div>
            <div style="position: absolute; top: 12px; left: 12px; font-weight: bold; font-size: 16pt; color: ${accentColor}90; select-none">⚜</div>
            <div style="position: absolute; bottom: 12px; right: 12px; font-weight: bold; font-size: 16pt; color: ${accentColor}90; select-none">⚜</div>
            <div style="position: absolute; bottom: 12px; left: 12px; font-weight: bold; font-size: 16pt; color: ${accentColor}90; select-none">⚜</div>

            <!-- Top Header Split -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; border-bottom: 1.5px solid ${accentColor}30; padding-bottom: 12px; direction: rtl; box-sizing: border-box;">
              <div style="text-align: right; font-family: '${fontFamily}', sans-serif;">
                <strong style="font-size: 11pt; color: ${h1Color}; font-weight: 900; display: block;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                <span style="font-size: 9pt; color: ${bodyTextColor}be; font-weight: bold; display: block; margin-top: 2px;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
              </div>
              ${coverLogoType !== 'none' ? `
                <div style="padding: 5px; height: 50px; width: 50px; display: flex; align-items: center; justify-content: center;">
                  ${logoSvg.replace('width="70" height="70"', 'width="42" height="42"')}
                </div>
              ` : '<div></div>'}
              <div style="text-align: left; font-family: '${fontFamily}', sans-serif; font-size: 9pt; color: ${bodyTextColor}a0; font-weight: bold;">
                <span>تاريخ البحث: ${(coverYear || '').split('-')[0] || '[السنة الدراسية]'}</span>
              </div>
            </div>
            
            <!-- Mid vintage box for Title -->
            <div style="text-align: center; margin: 30px auto; max-width: 88%; padding: 25px 20px; border: 1.5px solid ${accentColor}40; background-color: ${accentColor}05; border-radius: 8px; width: 100%; box-sizing: border-box;">
              <h1 style="font-family: '${fontFamily}', sans-serif; font-size: 23pt; font-weight: 950; color: ${h1Color}; margin: 0; text-align: center !important; border-bottom: none !important; padding-bottom: 0 !important; line-height: 1.45;"><span contenteditable="plaintext-only" data-cover-field="title" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="عنوان البحث" style="min-width: 40px; display: inline-block;">${finalTitle}</span></h1>
              ${dividerHtml}
              <p style="font-family: '${fontFamily}', sans-serif; font-size: 11pt; color: ${bodyTextColor}be; margin: 12px 0 0 0; line-height: 1.6; font-weight: 500; text-align: center !important;"><span contenteditable="plaintext-only" data-cover-field="subtitle" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="العنوان الفرعي" style="min-width: 40px; display: inline-block;">${finalSubtitle}</span></p>
            </div>
            
            <div style="text-align: center; font-style: italic; color: ${accentColor}; font-size: 11pt; font-weight: 900; font-family: '${fontFamily}', sans-serif; margin-bottom: 5px; letter-spacing: 1px;">
              ❆ التقرير الأكاديمي والبحث الجامعي الموقر ❆
            </div>
            
            <!-- Bottom Symmetrical Boxes Split-Card -->
            <div style="display: flex; gap: 14px; width: 100%; direction: rtl; box-sizing: border-box;">
              <!-- Right Box (الجانب الأيمن): University, Faculty, Department -->
              <div style="flex: 1; border: 1.5px solid ${h1Color}30; border-radius: 6px; padding: 12px 16px; text-align: right; background-color: ${pageBgColor}; box-sizing: border-box;">
                <span style="font-size: 8.5pt; color: ${accentColor}; font-weight: bold; display: block; border-bottom: 1px dashed ${accentColor}20; padding-bottom: 2px; margin-bottom: 6px;">🏛️ تفصيل الجهة العلمية الراعية:</span>
                <strong style="font-size: 10pt; color: ${h1Color}; display: block;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                <span style="font-size: 9.5pt; color: ${bodyTextColor}95; display: block; font-weight: bold; margin-top: 3px;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                <span style="font-size: 8.5pt; color: ${bodyTextColor}80; display: block; margin-top: 2px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
              </div>
              
              <!-- Left Box (الجانب الأيسر): Student Name, Student ID, Doctor name, Year -->
              <div style="flex: 1.1; border: 1.5px solid ${h1Color}30; border-radius: 6px; padding: 12px 16px; text-align: right; background-color: ${pageBgColor}; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <span style="font-size: 8.5pt; color: ${accentColor}; font-weight: bold; display: block; border-bottom: 1px dashed ${accentColor}20; padding-bottom: 2px; margin-bottom: 6px;">✍️ مقدم من الطالب المتفوق:</span>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 10.5pt; color: ${h1Color};"><span contenteditable="plaintext-only" data-cover-field="student" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الاسم" style="min-width: 40px; display: inline-block;">${coverStudent}</span></strong>
                    <span style="font-size: 8.5pt; color: ${bodyTextColor}80; font-family: 'JetBrains Mono', monospace; font-weight: bold;">ج/<span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></span>
                  </div>
                  <div style="margin-top: 4px;">
                    <span style="font-size: 9.5pt; color: ${bodyTextColor}be;"><b>تحت إشراف الأستاذ المشرف:</b> أ.د. <span contenteditable="plaintext-only" data-cover-field="doctor" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="دكتور/أستاذ المادة" style="min-width: 40px; display: inline-block;">${coverDoctor}</span></span>
                  </div>
                </div>
                <div style="margin-top: 8px; font-size: 8pt; color: ${bodyTextColor}70; text-align: left; font-weight: bold;">
                  <span>📅 تاريخ التقديم: <span contenteditable="plaintext-only" data-cover-field="year" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="السنة الدراسية" style="min-width: 40px; display: inline-block;">${coverYear}</span></span>
                </div>
              </div>
            </div>
          </div>
        `;
        break;
      }
      case 'minimalist': {
        innerContent = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 60px 45px; box-sizing: border-box; background-color: ${pageBgColor};">
            <!-- Top minimal header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid ${accentColor}15; padding-bottom: 18px; width: 100%;">
              <div style="text-align: right; font-family: '${fontFamily}', sans-serif;">
                <span style="font-size: 11.5pt; color: ${h1Color}; font-weight: 850; display: block;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></span>
                <span style="font-size: 9.5pt; color: ${bodyTextColor}a0; display: block; margin-top: 2px; font-weight: bold;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
              </div>
              ${coverLogoType !== 'none' ? `<div style="opacity: 0.85;">${logoSvg.replace('width="70" height="70"', 'width="45" height="45"')}</div>` : ''}
            </div>
            
            <!-- Bold Minimal Content (العنوان في الوسط) -->
            <div style="margin: 50px 0; text-align: center; width: 100%;">
              <span style="font-size: 9.5pt; color: ${accentColor}; font-weight: 900; letter-spacing: 2px; display: block; margin-bottom: 10px; font-family: '${fontFamily}', sans-serif; text-transform: uppercase;">دراسة وتنسيق ومراجعة علمية متطورة</span>
              <p style="font-family: '${fontFamily}', sans-serif; font-size: 25pt; font-weight: 850; color: ${h1Color}; margin: 0; line-height: 1.35; text-align: center !important; border-bottom: none !important; padding-bottom: 0 !important;"><span contenteditable="plaintext-only" data-cover-field="title" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="عنوان البحث" style="min-width: 40px; display: inline-block;">${finalTitle}</span></p>
              ${getCoverDividerHtml('fancy', accentColor).replace('margin: 25px 0', 'margin: 18px 0')}
              <p style="font-family: '${fontFamily}', sans-serif; font-size: 11.5pt; color: ${bodyTextColor}85; margin-top: 12px; line-height: 1.6; font-weight: 400; text-align: center !important;"><span contenteditable="plaintext-only" data-cover-field="subtitle" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="العنوان الفرعي" style="min-width: 40px; display: inline-block;">${finalSubtitle}</span></p>
            </div>
            
            <!-- Symmetrical column layout at the bottom: Partitioned as requested -->
            <div style="border-top: 1.5px solid ${accentColor}25; padding-top: 20px; margin-top: 35px; direction: rtl; width: 100%; box-sizing: border-box; font-family: '${fontFamily}', sans-serif;">
              <table style="width: 100%; border-collapse: collapse; border: none !important;">
                <tr style="border: none !important;">
                  <!-- Right Column (الجانب الأيمن): University details (45% Width) -->
                  <td style="width: 45%; text-align: right; vertical-align: top; border: none !important; padding: 0 0 10px 10px; line-height: 1.5;">
                    <span style="font-size: 9pt; color: ${accentColor}; display: block; margin-bottom: 4px; font-weight: bold;">🏛️ الجهة الأكاديمية:</span>
                    <strong style="font-size: 11pt; color: ${h1Color}; font-weight: 900; display: block;"><span contenteditable="plaintext-only" data-cover-field="university" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="اسم الجامعة" style="min-width: 40px; display: inline-block;">${coverUniversity}</span></strong>
                    <span style="font-size: 9.5pt; color: ${bodyTextColor}bb; display: block; margin-top: 2px;"><span contenteditable="plaintext-only" data-cover-field="faculty" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الكلية/المعهد" style="min-width: 40px; display: inline-block;">${coverFaculty}</span></span>
                    <span style="font-size: 8.5pt; color: ${bodyTextColor}80; display: block; margin-top: 2px;"><span contenteditable="plaintext-only" data-cover-field="department" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="القسم الأكاديمي" style="min-width: 40px; display: inline-block;">${coverDepartment}</span></span>
                  </td>
                  <!-- Middle simple separator line -->
                  <td style="width: 6%; border: none !important; text-align: center; border-left: 1px dashed ${accentColor}20;"></td>
                  <!-- Left Column (الجانب الأيسر): Student details (49% Width) -->
                  <td style="width: 49%; text-align: right; vertical-align: top; border: none !important; padding: 0 10px 10px 0; line-height: 1.5;">
                    <div style="margin-bottom: 6px;">
                      <span style="font-size: 9pt; color: ${accentColor}; display: block; margin-bottom: 4px; font-weight: bold;">✍️ مقدم من الطالب المتفوق:</span>
                      <strong style="font-size: 11pt; color: ${h1Color}; font-weight: 900; display: inline-block;"><span contenteditable="plaintext-only" data-cover-field="student" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الاسم" style="min-width: 40px; display: inline-block;">${coverStudent}</span></strong>
                      <span style="font-size: 8.5pt; color: ${bodyTextColor}80; font-family: 'JetBrains Mono', monospace; margin-right: 8px;">الرقم الجامعي: <span contenteditable="plaintext-only" data-cover-field="studentId" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="الرقم الجامعي" style="min-width: 40px; display: inline-block;">${coverStudentId}</span></span>
                    </div>
                    <div>
                      <span style="font-size: 10pt; color: ${bodyTextColor};"><b>تحت إشراف الأستاذ:</b> أ.د. <span contenteditable="plaintext-only" data-cover-field="doctor" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="دكتور/أستاذ المادة" style="min-width: 40px; display: inline-block;">${coverDoctor}</span></span>
                    </div>
                    <div style="margin-top: 6px; font-size: 8.5pt; color: ${bodyTextColor}70;">
                      <span>📅 تاريخ التسليم والتقديم: <span contenteditable="plaintext-only" data-cover-field="year" class="editable-cover-text outline-none cursor-text hover:bg-slate-500/5 focus:bg-slate-500/10 focus:ring-1 ring-blue-400 rounded px-1 transition-all" data-placeholder="السنة الدراسية" style="min-width: 40px; display: inline-block;">${coverYear}</span></span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        `;
        break;
      }
      default:
        break;
    }

    return innerContent;
  };

  // Generate and download final styled PDF

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const liveBody = document.getElementById('live-editable-pdf-body');
      if (!liveBody) throw new Error('Live body not found');

      const isPortrait = pageOrientation === 'portrait';
      // High-quality rendering resolution A4
      const a4WidthPx = isPortrait ? 794 : 1123; 
      const a4HeightPx = isPortrait ? 1123 : 794;
      const paddingPx = 50; 
      
      const maxUsableHeightPx = a4HeightPx - (paddingPx * 2) - 60; // Normal boundary (reserves space for footer)
      const tolerancePx = 65; // Tolerance explicit boundary to prevent orphan lines

      // Create a background rendering container outside the viewport
      const renderContainer = document.createElement('div');
      renderContainer.style.position = 'absolute';
      renderContainer.style.left = '-9999px';
      renderContainer.style.top = '0';
      renderContainer.style.width = '200vw'; // enough room
      renderContainer.style.opacity = '0';
      renderContainer.style.pointerEvents = 'none';
      renderContainer.style.zIndex = '-9999';
      document.body.appendChild(renderContainer);

      // Inject dynamic styles so exactly the same CSS applies in our offline renderer
      const styleEl = document.createElement('style');
      styleEl.innerHTML = dynamicCss;
      renderContainer.appendChild(styleEl);

      const createPage = () => {
        const page = document.createElement('div');
        page.className = 'p-sheet preview-container-pane';
        page.style.width = `${a4WidthPx}px`;
        page.style.minHeight = `${a4HeightPx}px`;
        page.style.marginBottom = '20px';
        page.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        page.style.backgroundColor = pageBgColor;
        page.style.padding = `${paddingPx}px`;
        page.style.boxSizing = 'border-box';
        page.style.direction = 'rtl';
        // Hide shadows/borders during export for a totally clean page
        page.style.boxShadow = 'none';
        page.style.border = 'none';
        page.style.position = 'relative';
        page.style.overflow = 'hidden'; 
        
        const contentContainer = document.createElement('div');
        contentContainer.style.direction = 'rtl';
        contentContainer.style.textAlign = 'right';
        
        page.appendChild(contentContainer);
        renderContainer.appendChild(page);
        
        return { page, contentContainer };
      };

      const pages: { page: HTMLElement, contentContainer: HTMLElement }[] = [];
      let current: { page: HTMLElement, contentContainer: HTMLElement };

      if (showCoverPage) {
        // Page 1: Cover Page
        const coverPage = createPage();
        pages.push(coverPage);
        
        coverPage.page.style.padding = '0px';
        coverPage.page.style.height = `${a4HeightPx}px`;
        coverPage.contentContainer.style.height = '100%';
        coverPage.contentContainer.style.width = '100%';
        coverPage.contentContainer.style.position = 'relative';
        
        const coverHtml = getCoverPageHtml();
        coverPage.contentContainer.innerHTML = coverHtml;
        
        // Create Page 2 where actual content begins
        current = createPage();
        pages.push(current);
      } else {
        current = createPage();
        pages.push(current);

        // Add cover header strictly once on the first page if cover page is disabled
        if (showHeader) {
          const headerDiv = document.createElement('div');
          headerDiv.innerHTML = compiledCoverHeader;
          current.contentContainer.appendChild(headerDiv);
        }
      }

      // Parse the HTML into discrete nodes
      const tempContentParser = document.createElement('div');
      
      // Clean up UI-only inline padding/margins injected by `useLayoutEffect` preview slicing
      const cleanHtml = liveBody.innerHTML.replace(/margin-top:\s*[\d.]+px;?/g, '').replace(/data-original-mt="[^"]*"/g, '');
      tempContentParser.innerHTML = cleanHtml;

      // Appendix Logic for PDF
      if (showAppendixImages) {
          const imagesFound: {url: string, alt: string}[] = [];
          const inlineImages = liveBody.querySelectorAll('img');
          inlineImages.forEach(img => {
              imagesFound.push({
                  url: img.getAttribute('src') || '',
                  alt: img.getAttribute('alt') || ''
              });
          });

          if (imagesFound.length > 0) {
              const pb = document.createElement('div');
              pb.className = 'pdf-page-break';
              tempContentParser.appendChild(pb);

              const appendixTitle = document.createElement('h1');
              appendixTitle.style.textAlign = 'center';
              appendixTitle.style.color = h1Color;
              appendixTitle.style.fontFamily = fontFamily;
              appendixTitle.style.marginTop = '40px';
              appendixTitle.style.marginBottom = '30px';
              appendixTitle.style.borderBottom = `2px solid ${accentColor}40`;
              appendixTitle.style.paddingBottom = '15px';
              appendixTitle.textContent = 'ملحق الصور والأشكال والمخططات';
              tempContentParser.appendChild(appendixTitle);

              imagesFound.forEach((img, idx) => {
                  const imgDiv = document.createElement('div');
                  imgDiv.style.textAlign = 'center';
                  imgDiv.style.margin = '35px 0';
                  imgDiv.style.pageBreakInside = 'avoid';
                  
                  const imgEl = document.createElement('img');
                  imgEl.src = img.url;
                  imgEl.style.maxWidth = '90%';
                  imgEl.style.maxHeight = '400px';
                  imgEl.style.borderRadius = '12px';
                  imgEl.style.border = `1.5px solid ${accentColor}30`;
                  imgEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)';
                  
                  const caption = document.createElement('p');
                  caption.style.textAlign = 'center';
                  caption.style.fontSize = '11pt';
                  caption.style.color = h1Color;
                  caption.style.fontWeight = '900';
                  caption.style.marginTop = '12px';
                  caption.style.fontFamily = fontFamily;
                  caption.textContent = `شكل (${idx + 1}): ${img.alt || 'صورة توضيحية للبحث'}`;
                  
                  imgDiv.appendChild(imgEl);
                  imgDiv.appendChild(caption);
                  tempContentParser.appendChild(imgDiv);
              });
          }
      }

      // Extract TOC elements before paginating
      let tocMapping: { id: string, text: string, level: number }[] = [];
      if (showAutoTOC) {
        const headings = tempContentParser.querySelectorAll('h1, h2, h3');
        if (headings.length > 0) {
          headings.forEach((h, idx) => {
            const id = `toc-heading-${idx}`;
            h.setAttribute('data-id', id);
            tocMapping.push({
              id,
              text: h.textContent || '',
              level: parseInt(h.tagName[1] || '2')
            });
          });

          const tocContainer = document.createElement('div');
          tocContainer.id = 'dynamic-toc-container';
          tocContainer.style.marginBottom = '24px';
          tocContainer.style.padding = '20px 30px';
          tocContainer.style.backgroundColor = blockquoteBg;
          tocContainer.style.border = `2px ${borderStyle} ${accentColor}40`;
          tocContainer.style.borderRadius = '8px';
          tocContainer.style.direction = 'rtl';
          
          tocContainer.innerHTML = `<h2 style="color: ${h1Color}; text-align: center; margin-bottom: 24px; font-weight: 800; font-family: '${fontFamily}'; font-size: 16pt;">فهرس المحتويات تلقائي</h2>
             <div id="dynamic-toc-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
          `;
          
          tempContentParser.insertBefore(tocContainer, tempContentParser.firstChild);

          const pb = document.createElement('div');
          pb.className = 'pdf-page-break';
          tempContentParser.insertBefore(pb, tocContainer.nextSibling);
        }
      }

      // Smart append function recursively distributes elements into pages
      const appendSmartly = (node: Node) => {
        if (!node) return;
        
        // High fidelity page-break detector: splits pages on explicit command
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.classList.contains('pdf-page-break') || el.getAttribute('data-page-break') === 'true') {
            current = createPage();
            pages.push(current);
            return;
          }
        }
        
        // Specialized handling to break lists across pages seamlessly
        if ((node.nodeName === 'UL' || node.nodeName === 'OL') && node.childNodes.length > 0) {
           let listCloneCurrent = node.cloneNode(false) as HTMLElement;
           current.contentContainer.appendChild(listCloneCurrent);
           
           const listItems = Array.from(node.childNodes);
           for (let j = 0; j < listItems.length; j++) {
             const li = listItems[j].cloneNode(true);
             listCloneCurrent.appendChild(li);
             
             // Check if pushing this list item exceeds the page
             const currentHeight = current.contentContainer.getBoundingClientRect().height;
             const isAbsoluteLastItem = Array.from(tempContentParser.childNodes)[Array.from(tempContentParser.childNodes).length - 1] === node && j === listItems.length - 1;
             
             if (currentHeight > maxUsableHeightPx) {
               // Only push if it exceeds the tolerance or if it's NOT the very last item of the entire document
               if (!isAbsoluteLastItem && currentHeight > maxUsableHeightPx + tolerancePx) {
                 // Full page! Remove exactly the overflowing item
                 listCloneCurrent.removeChild(li);
                 
                 // If the list ended up empty on the previous page, drop the container
                 if (listCloneCurrent.childNodes.length === 0) {
                   current.contentContainer.removeChild(listCloneCurrent);
                 }
                 
                 current = createPage();
                 pages.push(current);
                 
                 // Recreate list architecture for the overflowed items
                 listCloneCurrent = node.cloneNode(false) as HTMLElement;
                 listCloneCurrent.appendChild(li);
                 current.contentContainer.appendChild(listCloneCurrent);
               }
             }
           }
        } else if (node.nodeName === 'TABLE') {
          // Specialized handling to break tables across pages seamlessly and repeat headers
          let tableCloneCurrent = node.cloneNode(false) as HTMLElement;
          const originalThead = (node as HTMLElement).querySelector('thead');
          if (originalThead) {
            tableCloneCurrent.appendChild(originalThead.cloneNode(true));
          }
          let tbodyCloneCurrent = document.createElement('tbody');
          tableCloneCurrent.appendChild(tbodyCloneCurrent);
          current.contentContainer.appendChild(tableCloneCurrent);

          const rows = Array.from((node as HTMLElement).querySelectorAll('tbody tr'));
          if (rows.length === 0) {
            // Find any tr that are not inside direct thead
            const cellsTr = Array.from((node as HTMLElement).querySelectorAll('tr')).filter(
              r => !r.parentElement || r.parentElement.nodeName !== 'THEAD'
            );
            rows.push(...cellsTr);
          }

          for (let j = 0; j < rows.length; j++) {
            const tr = rows[j].cloneNode(true);
            tbodyCloneCurrent.appendChild(tr);

            const currentHeight = current.contentContainer.getBoundingClientRect().height;
            const isAbsoluteLastRow = Array.from(tempContentParser.childNodes)[Array.from(tempContentParser.childNodes).length - 1] === node && j === rows.length - 1;

            if (currentHeight > maxUsableHeightPx) {
              if (!isAbsoluteLastRow && currentHeight > maxUsableHeightPx + tolerancePx) {
                // Remove overflowing row
                tbodyCloneCurrent.removeChild(tr);

                // If previous table became empty, remove it from list
                if (tbodyCloneCurrent.childNodes.length === 0) {
                  current.contentContainer.removeChild(tableCloneCurrent);
                }

                current = createPage();
                pages.push(current);

                // Start table again on new page
                tableCloneCurrent = node.cloneNode(false) as HTMLElement;
                if (originalThead) {
                  tableCloneCurrent.appendChild(originalThead.cloneNode(true));
                }
                tbodyCloneCurrent = document.createElement('tbody');
                tableCloneCurrent.appendChild(tbodyCloneCurrent);
                current.contentContainer.appendChild(tableCloneCurrent);

                tbodyCloneCurrent.appendChild(tr);
              }
            }
          }
        } else {
           // Standard block (Paragraph, Header, Table block, Div, BR, TextNode)
           const clone = node.cloneNode(true) as HTMLElement;
           current.contentContainer.appendChild(clone);
           
           // Allow single giant blocks exactly ONE span before hard overflow is hidden via standard page height rules
           const currentHeight = current.contentContainer.getBoundingClientRect().height;
           const isAbsoluteLastItem = Array.from(tempContentParser.childNodes)[Array.from(tempContentParser.childNodes).length - 1] === node;
           
           if (currentHeight > maxUsableHeightPx && current.contentContainer.childNodes.length > 1) {
              if (isAbsoluteLastItem || currentHeight <= maxUsableHeightPx + tolerancePx) {
                 // Forgiveness tolerance: allows orphan lines to stick to the same page
                 // Do nothing, let it stay!
              } else {
                 current.contentContainer.removeChild(clone);
                 
                 current = createPage();
                 pages.push(current);
                 
                 current.contentContainer.appendChild(clone);
              }
           }
        }
      };

      // Append all children smartly flowing onto new distinct standard A4 sheets
      Array.from(tempContentParser.childNodes).forEach(child => {
         // Ignore purely empty text nodes acting as DOM whitespace overhead
         if (child.nodeType === 3 && !child.textContent?.trim()) return;
         appendSmartly(child);
      });

      // Add uniform footers statically at the bottom tracking correct absolute bounds
      if (showFooter) {
         pages.forEach((p, index) => {
             // Skip cover page footer if enabled
             if (showCoverPage && index === 0) return;

             const footer = document.createElement('div');
             footer.style.position = 'absolute';
             footer.style.bottom = `${paddingPx}px`;
             footer.style.left = '0';
             footer.style.right = '0';
             footer.style.textAlign = 'center';
             footer.style.fontSize = '8.5pt';
             footer.style.color = bodyTextColor + '80';
             footer.style.borderTop = `1px solid ${accentColor}30`;
             footer.style.fontFamily = `'${fontFamily}', sans-serif`;
             
             const displayPageNumber = showCoverPage ? index : index + 1;
             const displayPageCount = showCoverPage ? pages.length - 1 : pages.length;

             footer.innerHTML = `<div style="padding-top: 12px; margin: 0 40px;">
               تاريخ التصدير: ${todayFormatted}${customFooterText ? ` &nbsp;|&nbsp; ${customFooterText}` : ''} <span style="margin-right: 15px; opacity: 0.65;">(الصفحة ${displayPageNumber} من ${displayPageCount})</span>
             </div>`;
             
             p.page.appendChild(footer);
         });
      }

      // Fill the TOC with authentic page numbers now that pagination is locked!
      if (showAutoTOC && tocMapping.length > 0) {
         let actualTocList: HTMLElement | null = null;
         pages.forEach((p) => {
            const found = p.page.querySelector('#dynamic-toc-list');
            if (found) actualTocList = found as HTMLElement;
         });
         
         if (actualTocList) {
            tocMapping.forEach(item => {
               let pageNum = 1;
               for (let i = 0; i < pages.length; i++) {
                 if (pages[i].page.querySelector(`[data-id="${item.id}"]`)) {
                    pageNum = showCoverPage ? i : i + 1; // logical page display number
                    break;
                 }
               }
               
               const row = document.createElement('div');
               row.style.display = 'flex';
               row.style.justifyContent = 'space-between';
               row.style.alignItems = 'baseline';
               row.style.paddingRight = `${(item.level - 1) * 18}px`;
               row.style.fontSize = item.level === 1 ? '11.5pt' : '10.5pt';
               row.style.fontWeight = item.level === 1 ? 'bold' : 'normal';
               row.style.color = bodyTextColor;
               
               const titleSpan = document.createElement('span');
               titleSpan.textContent = item.text;
               titleSpan.style.backgroundColor = blockquoteBg;
               titleSpan.style.paddingLeft = '5px';
               titleSpan.style.zIndex = '10';
               
               const dots = document.createElement('div');
               dots.style.flexGrow = '1';
               dots.style.borderBottom = `2px dotted ${accentColor}80`;
               dots.style.margin = '0 8px';
               dots.style.transform = 'translateY(-4px)';
               
               const pageSpan = document.createElement('span');
               pageSpan.textContent = pageNum.toString();
               pageSpan.style.backgroundColor = blockquoteBg;
               pageSpan.style.paddingRight = '5px';
               pageSpan.style.fontWeight = 'bold';
               pageSpan.style.zIndex = '10';
               
               row.appendChild(titleSpan);
               row.appendChild(dots);
               row.appendChild(pageSpan);
               
               actualTocList!.appendChild(row);
            });
         }
      }

      // Allow fonts and geometric layout rules to settle
      await new Promise(resolve => setTimeout(resolve, 300));

      // Wait for all images across all draft pages to load completely (CORS-friendly checks)
      const imageLoadPromises: Promise<any>[] = [];
      pages.forEach(p => {
        const imgs = p.page.querySelectorAll('img');
        imgs.forEach((img: any) => {
          if (img && !img.complete) {
            imageLoadPromises.push(
              new Promise((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false); // don't block the document generation if 1 image fails
              })
            );
          }
        });
      });
      if (imageLoadPromises.length > 0) {
        await Promise.all(imageLoadPromises);
        // Wait a tiny bit more for layout update after images get loaded
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const pdf = new jsPDF({
        orientation: pageOrientation,
        unit: 'px',
        format: [a4WidthPx, a4HeightPx]
      });

      // Sequential rasterization for maximum browser stability and preventing memory crashes in long documents
      const pageDataUrls: string[] = [];
      for (const p of pages) {
        const dataUrl = await htmlToImage.toJpeg(p.page, {
          quality: 0.88, // Optimized balance between size and high visual clarity
          pixelRatio: 1.5, // High-performance resolution for clear text and sharp images
          backgroundColor: pageBgColor,
          cacheBust: false,
          skipFonts: false // Ensure fonts are embedded correctly
        });
        pageDataUrls.push(dataUrl);
      }

      pageDataUrls.forEach((dataUrl, i) => {
        if (i > 0) pdf.addPage();
        
        pdf.addImage(dataUrl, 'JPEG', 0, 0, a4WidthPx, a4HeightPx, undefined, 'FAST');

        // Dynamic overlay mapping for interactive clickable links
        try {
          const pageEl = pages[i].page;
          const pageRect = pageEl.getBoundingClientRect();
          const anchors = pageEl.querySelectorAll('a');
          
          anchors.forEach((anchor: any) => {
            const href = anchor.getAttribute('href');
            if (href && href.trim() && !href.startsWith('javascript:')) {
              const anchorRect = anchor.getBoundingClientRect();
              const scaleX = a4WidthPx / pageRect.width;
              const scaleY = a4HeightPx / pageRect.height;
              
              const x = (anchorRect.left - pageRect.left) * scaleX;
              const y = (anchorRect.top - pageRect.top) * scaleY;
              const w = anchorRect.width * scaleX;
              const h = anchorRect.height * scaleY;
              
              if (w > 1 && h > 1 && x >= 0 && y >= 0) {
                pdf.link(x, y, w, h, { url: href });
              }
            }
          });
        } catch (linkErr) {
          console.error('Failed to parse overlay link annotations on page ' + i, linkErr);
        }
      });

      // Clean offline rendering structure
      document.body.removeChild(renderContainer);
      
      pdf.save(`${fileName || 'تقرير_معدل'}.pdf`);
      onClose(); // Automatically close on successful completion

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إعداد التصدير. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#01040f]/95 backdrop-blur-md animate-in fade-in duration-200 p-0 md:p-4 text-right" dir="rtl">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-7xl h-[100vh] md:h-[95vh] md:rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative">
        
        {/* Style configurations element loader */}
        <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1e293b]/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center border border-red-400/20 shadow-lg shadow-red-500/10">
              <i className="fas fa-magic text-white text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-base md:text-lg font-sans">مصمم ومنسّق الـ PDF التفاعلي الاحترافي</h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">تحديث فوري</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">انقر مباشرة على أي نص داخل صفحة A4 للتعديل والتحرير، أو اضغط الزر السحري أدناه للتحكم الشامل!</p>
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

        {/* Consolidated Single Control Button Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#141d2f] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveSetupTab('content');
                setShowAdvancedStyles(true);
              }}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 hover:from-red-500 hover:via-rose-500 hover:to-indigo-600 text-white font-bold text-[11px] md:text-xs shadow-lg shadow-indigo-650/10 hover:shadow-indigo-650/20 border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer relative group overflow-hidden"
              style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              title="انقر لتعديل المحتوى النصي، تغيير الخطوط والألوان في لوحة واحدة"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              <i className="fas fa-sliders-h text-sm"></i>
              <span>لوحة التحكم وتنسيق المظهر الشامل 🎨⚙️</span>
            </button>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 px-2 py-1.5 rounded-lg transition-colors shrink-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] text-emerald-400 font-extrabold whitespace-nowrap">الكتابة والتحرير المباشر مفعل</span>
            </div>

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
                title="شريط التحكم في تكبير/تصغير الصفحة"
              />

              <button 
                onClick={() => setZoom(Math.min(1.3, zoom + 0.05))}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white cursor-pointer text-xs transition-colors duration-150"
                title="تكبير المعاينة"
                type="button"
              >
                <i className="fas fa-plus text-[10px]"></i>
              </button>

              <span className="text-[10px] text-indigo-400 font-bold font-mono min-w-[34px] text-center select-none">
                {Math.round(zoom * 100)}%
              </span>

              <div className="hidden sm:block w-px h-3.5 bg-white/10 mx-0.5"></div>

              <div className="hidden sm:flex items-center gap-1 select-none">
                <button 
                  onClick={() => setZoom(0.5)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all duration-150 ${zoom === 0.5 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  type="button"
                >
                  ٥٠٪
                </button>
                <button 
                  onClick={() => setZoom(0.7)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all duration-150 ${zoom === 0.7 ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  type="button"
                >
                  ٧٠٪
                </button>
                <button 
                  onClick={() => setZoom(1.0)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all duration-150 ${zoom === 1.0 ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  type="button"
                >
                  ١٠٠٪
                </button>
              </div>

              <div className="w-px h-3.5 bg-white/10 mx-0.5"></div>

              <button 
                onClick={() => setZoom(0.70)}
                className="px-2.5 py-1 rounded-md text-[9px] bg-indigo-500/10 text-indigo-300 hover:bg-[#11141e]/50 hover:text-white transition-all font-bold cursor-pointer whitespace-nowrap"
                type="button"
              >
                ملائم
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body & Full Screen Centered Page Editor */}
        <div className="flex-1 flex flex-col bg-[#070b16] overflow-hidden active-sheet-wrapper p-2 md:p-4">
          
          {/* Centered White Paper Canvas */}
          <div id="pdf-preview-scroll-container" className="flex-1 w-full bg-slate-950/30 border border-white/5 rounded-2xl p-2 md:p-6 overflow-y-auto overflow-x-auto flex justify-center items-start custom-scrollbar shadow-inner relative group min-h-0">
            <div 
              className="flex justify-center transition-none relative"
              style={{
                width: `${(pageOrientation === 'portrait' ? 210 : 297) * zoom}mm`,
                minHeight: `${(pageOrientation === 'portrait' ? 297 : 210) * zoom}mm`,
                overflow: 'visible'
              }}
            >

              {/* Genuine Active Content - Text perfectly sliced by margins via useEffect */}
              <div 
                id="pdf-export-element"
                className="text-slate-850 h-fit relative z-10 flex flex-col"
                style={{ 
                  width: pageOrientation === 'portrait' ? '210mm' : '297mm',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  direction: 'rtl', 
                  textAlign: 'right' 
                }}
              >
                {/* Visual A4 Layout Canvas Layer */}
                <div                
                  id="pdf-export-element"
                  ref={contentEditableRef}
                  className="preview-container-pane relative z-10 pointer-events-none" 
                  style={{}}
                >
                  
                  {/* Front Cover Layer dynamically inserted into document layout flow */}
                  {showCoverPage && (
                    <div 
                      className="w-full relative pointer-events-auto shrink-0 z-20 outline-none" 
                      style={{
                         height: pageOrientation === 'portrait' ? '1123px' : '794px',
                         marginBottom: '40px'
                      }}
                      dangerouslySetInnerHTML={{ __html: getCoverPageHtml() }}
                      onBlur={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.hasAttribute('data-cover-field')) return;
                        const field = target.getAttribute('data-cover-field');
                        const val = target.innerText || target.textContent || '';
                        if (field === 'university') setCoverUniversity(val);
                        if (field === 'faculty') setCoverFaculty(val);
                        if (field === 'department') setCoverDepartment(val);
                        if (field === 'title') setCoverTitle(val);
                        if (field === 'subtitle') setCoverSubtitle(val);
                        if (field === 'student') setCoverStudent(val);
                        if (field === 'studentId') setCoverStudentId(val);
                        if (field === 'doctor') setCoverDoctor(val);
                        if (field === 'course') setCoverCourse(val);
                        if (field === 'year') setCoverYear(val);
                      }}
                    />
                  )}

                  {/* Style dynamic Headers */}
                  {showHeader && (
                    <div className="border-b-2 pb-4 mb-6 text-center select-none" style={{ borderBottomColor: accentColor }}>
                      <p className="font-bold text-xl md:text-2xl tracking-tight" style={{ color: h1Color }}>{customTitle}</p>
                      <p className="text-[10px] md:text-xs mt-1.5 opacity-85">{customSubtitle}</p>
                    </div>
                  )}

                  {/* Fully Editable Wrapper Div inside the live page */}
                  <div 
                    ref={contentEditableRef}
                    id="live-editable-pdf-body" 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onInput={handleInlineInput}
                    className="outline-none focus:ring-1 focus:ring-indigo-500/20 rounded min-h-[160mm] py-1.5 px-1 selection:bg-indigo-100 placeholder:text-slate-300 relative text-right pointer-events-auto"
                    dir="auto"
                    dangerouslySetInnerHTML={{ __html: initialHtmlForEdit }}
                    title="انقر في أي مكان لبدء التحرير الفوري للورقة"
                  />

                  {/* Disable old single static footer, simulated ones above handle this now */}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Floating Custom Format Configurator Popup Modal ("واجهة منبثقة") */}
        {showAdvancedStyles && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-[#0b0e17] border border-indigo-500/20 w-full max-w-4xl md:max-w-5xl max-h-[92vh] rounded-3xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-right" dir="rtl">
              
              {/* Configurator Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0e1322]/80">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                    <i className="fas fa-sliders-h text-sm"></i>
                  </span>
                  <div>
                    <h4 className="text-white font-black text-sm md:text-base">ستوديو مخرّج الخطوط والتنسيقات الفنية المتقدمة 🎨</h4>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">صـمّم وطوّع الهوية البصرية للمستند وهتاف صفحاته بكفاءة المطابع الكبرى</p>
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

              {/* Configurator Side-by-Side Area */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#07090f]">
                
                 {/* Top Navigation Tabs Header (Horizontal row tab array) */}
                <div className="w-full border-b border-white/5 bg-[#0b0f1a] p-3 overflow-x-auto custom-scrollbar scrollbar-thin shrink-0 select-none">
                  <div className="flex flex-row items-center gap-2.5 min-w-max md:min-w-0 md:grid md:grid-cols-7 w-full">
                    {[
                      { id: 'content', label: 'مضمون المستند 📝', desc: 'تعديل الصياغة والترويسة', icon: 'fas fa-pen-nib' },
                      { id: 'cover', label: 'غلاف البحث 🏛️', desc: 'تنسيق صفحة الغلاف الأكاديمية', icon: 'fas fa-university' },
                      { id: 'images', label: 'التحكم بالصور 🖼️', desc: 'تعديل، تبديل وإدراج الصور', icon: 'fas fa-image' },
                      { id: 'presets', label: 'القوالب الجاهزة 🎨', desc: 'تخصيص كامل بضغطة واحدة', icon: 'fas fa-magic' },
                      { id: 'typography', label: 'تنسيق النصوص 📝', desc: 'تباعد وحجم خطوط التقرير', icon: 'fas fa-font' },
                      { id: 'colors', label: 'ألوان الهوية 🖌️', desc: 'ألوان العناصر والصفحة', icon: 'fas fa-palette' },
                      { id: 'layout', label: 'تخطيط الصفحة 📏', desc: 'الأعمدة، الإطارات وهوامش الورقة', icon: 'fas fa-crop-alt' }
                    ].map((tab) => {
                      const isActive = activeSetupTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSetupTab(tab.id as any)}
                          className={`flex-1 md:w-full text-right p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-2.5 border ${
                            isActive
                              ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200 shadow-md shadow-indigo-950/50'
                              : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                          type="button"
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'bg-[#151b2a] text-slate-400'
                          }`}>
                            <i className={`${tab.icon} text-xs`}></i>
                          </span>
                          <div className="min-w-0 pr-0.5 text-right">
                            <div className={`text-[11px] font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>{tab.label}</div>
                            <div className="text-[9px] text-slate-500 truncate mt-0.5">{tab.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Left Active Pane (Content Controls) */}
                <div className="flex-1 p-5 md:p-6 overflow-y-auto custom-scrollbar bg-[#080a10] flex flex-col justify-start min-h-0">
                  
                  {/* Tab Tab Panel 0: Content & Text Markup Editor */}
                  {activeSetupTab === 'content' && (
                    <div className="space-y-4 animate-in fade-in duration-200 flex flex-col h-full min-h-0">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">صياغة وتعديل المضمون النصي للمستند</h4>
                        <p className="text-slate-400 text-xs mt-1">تعديل اسم ملف الحفظ، وتفاصيل ترويسة الصفحة، والمحتوى المعياري (ماركداون) للتقرير للتحديث الفوري:</p>
                      </div>

                      {/* Info Inputs fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">اسم ملف التصدير:</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              placeholder="مستند_معدل..."
                              className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all font-sans pl-10"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono font-bold select-none">.pdf</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">عنوان الترويسة الرئيسي:</label>
                          <input 
                            type="text" 
                            value={customTitle}
                            onChange={(e) => {
                              setCustomTitle(e.target.value);
                              setCurrentThemeId('custom');
                            }}
                            placeholder="الترويسة الرئيسية..."
                            className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">عنوان الترويسة الفرعي:</label>
                          <input 
                            type="text" 
                            value={customSubtitle}
                            onChange={(e) => {
                              setCustomSubtitle(e.target.value);
                              setCurrentThemeId('custom');
                            }}
                            placeholder="العنوان الفرعي..."
                            className="w-full bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* Footer text customization in Content Tab */}
                      {showFooter && (
                        <div className="space-y-1.5 bg-[#11141e]/30 border border-white/5 p-3.5 rounded-2xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className="block text-slate-300 font-bold text-[11px]">نص تذييل الصفحة (الفوتر):</label>
                            <span className="text-[10px] text-slate-400 font-medium">اتركه فارغاً تماماً لإلغاء أي إشارة وحفظ الخصوصية والسرية</span>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 mt-1">
                            <input 
                              type="text" 
                              value={customFooterText}
                              onChange={(e) => setCustomFooterText(e.target.value)}
                              placeholder="مثال: جميع الحقوق محفوظة، أو اتركه فارغاً لإخفاء أي أثر للذكاء الاصطناعي..."
                              className="flex-1 bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomFooterText('')}
                              className="px-3.5 py-2 rounded-xl text-[10px] bg-red-400/10 hover:bg-red-400/25 text-red-400 hover:text-white transition-all duration-150 font-bold shrink-0 border border-red-500/10 flex items-center justify-center gap-1.5 cursor-pointer select-none w-full sm:w-auto"
                              title="تفريغ الخانة لحذف نص الفوتر"
                            >
                              <i className="fas fa-trash-alt text-[9px]"></i>
                              <span>تفريغ النص</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Markdown text editor & Advanced Toolbar */}
                      <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <i className="fas fa-edit text-indigo-400"></i>
                            <span>محرر المحتوى الهيكلي (سياق ماركداون):</span>
                          </div>
                          <span className="text-slate-500 text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded align-self-start sm:align-self-auto">{markdownContent.length} حرف</span>
                        </div>

                        {/* Interactive formatting and element generators helper bar */}
                        <div className="flex flex-wrap items-center gap-2 p-2 bg-[#0d111d] border border-white/5 rounded-2xl">
                          {/* Rich inline decorators */}
                          <div className="flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('**نص عريض**')}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                              title="تنسيق نص عريض"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('*نص مائل*')}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white italic text-xs flex items-center justify-center transition-all cursor-pointer"
                              title="تنسيق نص مائل"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('`رمز_برمجي`')}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer"
                              title="إدراج رمز برمجي خطي"
                            >
                              &lt;/&gt;
                            </button>
                          </div>

                          {/* Block builders */}
                          <div className="flex items-center flex-wrap gap-1 border-l border-white/10 pl-2">
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n# عنوان رئيسي جديد\n')}
                              className="px-2.5 h-8 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-300 text-[10.5px] font-bold flex items-center justify-center transition-all cursor-pointer"
                              title="إدراج عنوان رئيسي كبير H1"
                            >
                              H1
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n## عنوان فرعي ثانٍ\n')}
                              className="px-2.5 h-8 rounded-lg bg-indigo-600/5 hover:bg-indigo-600/25 text-indigo-300 text-[10.5px] font-bold flex items-center justify-center transition-all cursor-pointer"
                              title="إدراج عنوان فرعي H2"
                            >
                              H2
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n- عنصر في قائمة\n')}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs flex items-center justify-center transition-all cursor-pointer"
                              title="قائمة تعداد نقطي"
                            >
                              •
                            </button>
                          </div>

                          {/* Print Page Break forcing button */}
                          <button
                            type="button"
                            onClick={() => insertMarkdownText('\n[فاصل_صفحات]\n')}
                            className="px-3 h-8 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/15 text-[10.5px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/5"
                            title="إجبار نهاية صفحة لبدء صفحة جديدة A4"
                          >
                            <i className="fas fa-file-alt text-[9.5px]"></i>
                            <span>فاصل صفحات للطباعة A4 📄</span>
                          </button>

                          {/* Pre-styled Table Template Injectors */}
                          <div className="flex flex-wrap items-center gap-1 text-[10px] mr-auto">
                            <span className="text-slate-500 mr-2 hidden lg:inline">إدراج جداول:</span>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n| العـنبر / البنـد | الوصيف التفصيلي والمقاييس | التقييم النهائي | ملاحظات الإدارة |\n| :--- | :--- | :---: | :--- |\n| البند الأول | جودة البيانات وتناسق المستند الفني | ممتاز ✓ | مراجعة الفواصل |\n| البند الثاني | سرعة العمل والموثوقية القياسية | جيد جداً | مخرجات ممتازة |\n')}
                              className="px-2 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-all cursor-pointer text-[10px]"
                              title="إدراج جدول تحليل معياري فوري"
                            >
                              <i className="fas fa-list-alt text-[9px] text-blue-400"></i>
                              <span>جدول تحليل 📊</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n| الرقم الجامعي | اسم الطالب والتحصين | المعدل | حالة البحث والدعم |\n| :---: | :--- | :---: | :---: |\n| 442019183 | محمد فيصل الحربي | 96.5 | مكتمل ومعتمد ✓ |\n| 442018244 | خالد مشعل الهذلي | 89.2 | تحت التقييم والأرشفة |\n')}
                              className="px-2 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-all cursor-pointer text-[10px]"
                              title="إدراج جدول درجات وأرقام أكاديمية"
                            >
                              <i className="fas fa-graduation-cap text-[9px] text-yellow-500"></i>
                              <span>جدول أكاديمي 🎓</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertMarkdownText('\n| اليوم / التاريخ | موضوع الإنجاز والمسؤول | الأهمية | حالة التنفيذ |\n| :--- | :--- | :--- | :---: |\n| الأحد 18 ذو الحجة | تدقيق فواصل الصفحات والطباعة | عالية 🔥 | مكتمل ✓ |\n| الثلاثاء 20 ذو الحجة | المراجعة الجمالية وتناسق الخط العربي | عادية | جاري العمل |\n')}
                              className="px-2 h-7 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-all cursor-pointer text-[10px]"
                              title="إدراج جدول زمني للمهام والمواعيد"
                            >
                              <i className="fas fa-calendar-alt text-[9px] text-teal-400"></i>
                              <span>جدول مهام 📅</span>
                            </button>
                          </div>
                        </div>

                        <textarea
                          id="pdf-raw-markdown-editor"
                          value={markdownContent}
                          onChange={(e) => handleMarkdownChange(e.target.value)}
                          placeholder="اكتب أو عدل محتوى التقرير بنص ماركداون (مثل استخدام # للعناوين، - للنقاط، | للجداول)..."
                          className="w-full bg-[#080b15] border border-white/5 rounded-2xl p-4 text-slate-200 text-xs md:text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono leading-relaxed resize-none custom-scrollbar shadow-inner"
                          style={{ minHeight: '320px' }}
                        />
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-slate-400 text-[10px] leading-relaxed">
                          <span className="font-bold text-indigo-300 ml-1">💡 نصيحة للتعديل المباشر:</span>
                          أي تعديل تقوم به داخل هذه الصفحة سيعيد كتابة هيكلية الملف. ومع ذلك، بإمكانك النقر مباشرة وكتابة أي كلمة أو تعديل النص مباشرة فوق صفحة المعاينة A4!
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab Tab Panel 5: Cover Page settings */}
                  {activeSetupTab === 'cover' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">تجهيز غلاف البحث العلمي والأكاديمي الفاخر 🏛️</h4>
                        <p className="text-slate-400 text-xs mt-1">تتيح لك هذه اللوحة صياغة صفحة غلاف منفصلة واحترافية تماماً تسبق التقرير، تليق بكافة الأوراق والرسائل المعتمدة:</p>
                      </div>

                      {/* Main Cover Page Toggle Switch */}
                      <div className="bg-[#101524] p-4.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                        <div className="flex-1">
                          <span className="text-xs font-black text-white block mb-1">تضمين صفحة غلاف أكاديمية للمستند العلمي</span>
                          <p className="text-slate-400 text-[10px] leading-relaxed">عند التفعيل، سيقوم النظام بتوليد صفحة غلاف كاملة (صفحة الغلاف رقم 1) ذات خلفية وتصميم فاخر يحتوي على بياناتك الأكاديمية كاملة قبل بدء سياق البحث الأصلي.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer min-w-[50px] shrink-0">
                          <input 
                            type="checkbox" 
                            checked={showCoverPage}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShowCoverPage(checked);
                              if (checked) {
                                setTimeout(() => {
                                  const scrollContainer = document.getElementById('pdf-preview-scroll-container');
                                  if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                                }, 150);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                        </label>
                      </div>

                      {showCoverPage && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-300 pb-4">
                          
                          {/* 🏛️ Beautiful Predefined Cover Presets Grid */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="border-b border-white/5 pb-2">
                              <span className="text-xs font-black text-[#ffd700] block flex items-center gap-1.5">
                                <i className="fas fa-crown text-[11px]"></i> قوالب الأغلفة الأكاديمية الاحترافية الجاهزة (جاهز بضغطة واحدة):
                              </span>
                              <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">اختر أحد التنسيقات المصممة مسبقًا لتطبيق هيكل فني متكامل يجمع توزيع المحاذاة، الشعار والفاصل، الألوان المتناسقة والخطوط بصورة فورية مذهلة:</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 pt-2">
                              {[
                                {
                                  id: 'ksu_elite',
                                  name: '🏛️ طراز النخبة الأكاديمي',
                                  desc: 'إطار كلاسيكي يتوسطه الشعار الجامعي. ممتاز للرسائل والبحوث التاريخية العميقة.',
                                  tag: 'الأكثر تداولاً 🎓',
                                  themeClr: 'from-blue-600/30 to-slate-900',
                                  accent: '#1e3a8a',
                                  h1: '#0f172a',
                                  layout: 'classic',
                                  logo: 'crest',
                                  divider: 'double',
                                  font: 'Amiri'
                                },
                                {
                                  id: 'modern_stripe',
                                  name: '💡 شريط الابتكار التكنولوجي',
                                  desc: 'شريط تكنولوجي جانبي متدرج الألوان. مثالي لتقنيات الويب والذكاء الاصطناعي.',
                                  tag: 'عصري هجين ⚡',
                                  themeClr: 'from-teal-600/30 to-slate-900',
                                  accent: '#0d9488',
                                  h1: '#111827',
                                  layout: 'striped',
                                  logo: 'atom',
                                  divider: 'fancy',
                                  font: 'Tajawal'
                                },
                                {
                                  id: 'royal_gold',
                                  name: '✨ الغلاف الذهبي الملكي',
                                  desc: 'تنسيق متزن فخم باللون الذهبي البراق. مخصص لرسائل القانون والإدارة العالية.',
                                  tag: 'ملكي فاخر 🌟',
                                  themeClr: 'from-amber-600/30 to-slate-900',
                                  accent: '#b45309',
                                  h1: '#431407',
                                  layout: 'center',
                                  logo: 'book',
                                  divider: 'fancy',
                                  font: 'Cairo'
                                },
                                {
                                  id: 'editorial_clean',
                                  name: '🖋️ النمط التحريري البسيط',
                                  desc: 'توزيع رصيق لمحاذاة الهامش الأيسر وإخفاء الشعار ليعكس التفكر والعمق البصري.',
                                  tag: 'بسيط ناضج 🍃',
                                  themeClr: 'from-slate-600/30 to-slate-900',
                                  accent: '#1f2937',
                                  h1: '#111827',
                                  layout: 'minimalist',
                                  logo: 'none',
                                  divider: 'thin',
                                  font: 'Almarai'
                                },
                                {
                                  id: 'medical_science',
                                  name: '🔬 العلوم والأبحاث التجريبية',
                                  desc: 'هيكل متكامل واضح بشارة قبعة التخرج. مثالي للأوراق المعملية والأبحاث العملية.',
                                  tag: 'عملي قياسي 🧪',
                                  themeClr: 'from-sky-600/30 to-slate-900',
                                  accent: '#0284c7',
                                  h1: '#0f172a',
                                  layout: 'formal',
                                  logo: 'grad',
                                  divider: 'thin',
                                  font: 'Tajawal'
                                },
                                {
                                  id: 'andalus_emerald',
                                  name: '🕌 الطراز الأندلسي العريق',
                                  desc: 'برواز كتابي عريق مع لون إسلامي أنيق للغلاف، مخصص لإنتاجات الفصحى والشرعية.',
                                  tag: 'أصيل موروث 🕌',
                                  themeClr: 'from-emerald-600/30 to-slate-900',
                                  accent: '#15803d',
                                  h1: '#052e16',
                                  layout: 'classic',
                                  logo: 'book',
                                  divider: 'fancy',
                                  font: 'Amiri'
                                }
                              ].map((preset) => {
                                const isActive = activeCoverPresetId === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveCoverPresetId(preset.id);
                                      setCoverLayout(preset.layout as any);
                                      setCoverLogoType(preset.logo as any);
                                      setCoverDivider(preset.divider as any);
                                      setAccentColor(preset.accent);
                                      setH1Color(preset.h1);
                                      setFontFamily(preset.font);
                                    }}
                                    className={`relative text-right p-4 rounded-xl border text-white transition-all duration-300 flex flex-col justify-between overflow-hidden group select-none min-h-[145px] ${
                                      isActive 
                                        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10 scale-[1.01]' 
                                        : 'border-white/5 bg-gradient-to-br ' + preset.themeClr + ' hover:border-white/10 hover:scale-[1.01] hover:shadow-xl hover:-translate-y-0.5'
                                    }`}
                                  >
                                    {/* Selected Indicator Badge */}
                                    {isActive ? (
                                      <span className="absolute top-2.5 left-2.5 bg-indigo-500 text-[9px] text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow animate-pulse">
                                        <i className="fas fa-check-circle text-[9px]"></i> نشط حالياً
                                      </span>
                                    ) : (
                                      <span className="absolute top-2.5 left-2.5 bg-slate-900/80 text-slate-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        {preset.tag}
                                      </span>
                                    )}

                                    <div className="space-y-1.5 pr-1.5 mt-3">
                                      <h5 className="font-black text-[11px] sm:text-xs text-white group-hover:text-indigo-200 transition-colors leading-tight">{preset.name}</h5>
                                      <p className="text-slate-300/80 text-[9.5px] sm:text-[10px] leading-relaxed font-sans line-clamp-2 md:line-clamp-none">{preset.desc}</p>
                                    </div>

                                    {/* Summary tags list */}
                                    <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-white/10 text-[8.5px] sm:text-[9px] text-slate-300 font-sans font-bold w-full items-center">
                                      <span className="bg-black/30 px-2 py-0.5 rounded">برواز: {preset.layout}</span>
                                      <span className="bg-black/30 px-2 py-0.5 rounded">شعار: {preset.logo}</span>
                                      <span className="bg-black/30 px-2 py-0.5 rounded flex items-center gap-1"><i className="fas fa-font"></i> {preset.font}</span>
                                      <span className="w-3 h-3 rounded-full inline-block border-2 border-white/30 mr-auto self-center shadow-sm" style={{ backgroundColor: preset.accent }} title={`اللون الرئيسي: ${preset.accent}`}></span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Visual Design Grid */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                            <span className="text-xs font-black text-[#8da2ea] block border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                              <i className="fas fa-align-right text-[11px]"></i> تعديل النمط وتخصيص التفاصيل الإضافية للغلاف يدوياً:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] font-bold">هيكل وتوزيع عناصر الغلاف (Layout):</label>
                                <select
                                  value={coverLayout}
                                  onChange={(e) => {
                                    setCoverLayout(e.target.value as any);
                                    setActiveCoverPresetId('custom');
                                  }}
                                  className="w-full bg-[#151b2a] border border-white/5 border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="center">تصميم متقاطع متوازن (Balanced Center)</option>
                                  <option value="striped">شريط جانبي ملون وعصري (Modern Striped)</option>
                                  <option value="formal">تقرير رسمي تقليدي موثق (Formal Standard)</option>
                                  <option value="classic">إطار مزدوج عتيق عريق (Historical Classic)</option>
                                  <option value="minimalist">تحريري كلاسيكي بسيط (Editorial Minimalist)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] font-bold">شعار الهيئة العلمية (Logo type):</label>
                                <select
                                  value={coverLogoType}
                                  onChange={(e) => {
                                    setCoverLogoType(e.target.value as any);
                                    setActiveCoverPresetId('custom');
                                  }}
                                  className="w-full bg-[#151b2a] border border-white/5 border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="crest">🛡️ درع وتاج الجامعة الأكاديمي القديم</option>
                                  <option value="grad">🎓 قبعة التخرج وشهادة الامتياز الأرفع</option>
                                  <option value="atom">⚛️ ذرة العلوم الطبيعية والتقنيات التجريبية</option>
                                  <option value="book">📚 كتاب المعرفة وشعلة الحكمة المنيرة</option>
                                  <option value="custom">🖼️ شعار مخصص (من المعرض)</option>
                                  <option value="none">❌ بدون رمز (إخفاء الشعار تماماً)</option>
                                </select>
                                
                                {coverLogoType === 'custom' && (
                                    <div className="mt-3">
                                        <label className="block text-[11px] text-white/50 mb-1.5 px-0.5 font-medium"><i className="fas fa-image mr-1 ml-1 text-indigo-400"></i> شعار المعرض المخصص</label>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            id="customLogoUpload"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        if (ev.target?.result) setCoverCustomLogoBase64(ev.target.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="w-full bg-slate-900/50 border border-indigo-500/20 rounded-lg p-2 text-xs text-white file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                                        />
                                    </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] font-bold">نمط فاصل العنوان الرأسي:</label>
                                <select
                                  value={coverDivider}
                                  onChange={(e) => {
                                    setCoverDivider(e.target.value as any);
                                    setActiveCoverPresetId('custom');
                                  }}
                                  className="w-full bg-[#151b2a] border border-white/5 border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="fancy">✦  ✦  ✦ خط نجوم كنز المخطوط الفاخر</option>
                                  <option value="thin">ـ خط ناعم بسيط ورقيق وعصري</option>
                                  <option value="double">═ خط ملكي جامعي مزدوج سميك كلاسيكي</option>
                                  <option value="none">بدون فواصل (بساطة معاصرة للتقرير)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* University Meta Inputs */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                            <span className="text-xs font-black text-[#8da2ea] block border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                              <i className="fas fa-university text-[11px]"></i> بيانات المؤسسة والأقسام الأكاديمية:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">اسم الجامعة (أو المؤسسة العلمية) :</label>
                                <input 
                                  type="text" 
                                  value={coverUniversity}
                                  onChange={(e) => setCoverUniversity(e.target.value)}
                                  placeholder="مثال: جامعة الملك سعود..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">الكلية التخصصية المستهدفة :</label>
                                <input 
                                  type="text" 
                                  value={coverFaculty}
                                  onChange={(e) => setCoverFaculty(e.target.value)}
                                  placeholder="مثال: كلية العلوم وبحوث الأحياء..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">القسم العلمي / الشعبة دقيقة :</label>
                                <input 
                                  type="text" 
                                  value={coverDepartment}
                                  onChange={(e) => setCoverDepartment(e.target.value)}
                                  placeholder="مثال: قسم العلوم البيولوجية الدقيقة..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Subject & Title Overrides */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                            <span className="text-xs font-black text-[#8da2ea] block border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                              <i className="fas fa-heading text-[11px]"></i> صياغة عنوان الغلاف المخصص:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">عنوان الغلاف التفصيلي المكتوب:</label>
                                <input 
                                  type="text" 
                                  value={coverTitle}
                                  onChange={(e) => setCoverTitle(e.target.value)}
                                  placeholder="اتركه فارغاً لاعتماد عنوان التقرير العام..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans font-bold"
                                />
                                <span className="text-[9px] text-slate-500 block">إذا تركته فارغاً سيقوم الغلاف بعرض العنوان الحالي تلقائياً لسهولة التنسيق.</span>
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">العنوان الفرعي للغلاف:</label>
                                <input 
                                  type="text" 
                                  value={coverSubtitle}
                                  onChange={(e) => setCoverSubtitle(e.target.value)}
                                  placeholder="اتركه فارغاً لاعتماد العنوان الفرعي للتقرير..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Author Student & Supervisors */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                            <span className="text-xs font-black text-[#8da2ea] block border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                              <i className="fas fa-user-friends text-[11px]"></i> هويات الطالب والباحث والفيصل المشرف:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">العضو / إعداد الطالب الباحث :</label>
                                <input 
                                  type="text" 
                                  value={coverStudent}
                                  onChange={(e) => setCoverStudent(e.target.value)}
                                  placeholder="اكتب اسمك الثلاثي كمعدّ للتقرير..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans font-black text-indigo-300"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">الرقم الجامعي / الرقم الأكاديمي :</label>
                                <input 
                                  type="text" 
                                  value={coverStudentId}
                                  onChange={(e) => setCoverStudentId(e.target.value)}
                                  placeholder="مثال: ٢٣١١٠٥٧٨٢..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans text-amber-300 font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">تحت إشراف الأستاذ الدكتور المشرف :</label>
                                <input 
                                  type="text" 
                                  value={coverDoctor}
                                  onChange={(e) => setCoverDoctor(e.target.value)}
                                  placeholder="مثال: أ.د. عبد الرحمن الفوزان..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans font-bold text-emerald-300"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Course Details & Year */}
                          <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3.5">
                            <span className="text-xs font-black text-[#8da2ea] block border-b border-white/5 pb-1.5 flex items-center gap-1.5">
                              <i className="fas fa-book-open text-[11px]"></i> تفاصيل المادة والسنة الدراسية:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">اسم المقرر الدراسي التابع :</label>
                                <input 
                                  type="text" 
                                  value={coverCourse}
                                  onChange={(e) => setCoverCourse(e.target.value)}
                                  placeholder="مثال: علوم أحياء عامة / ميكروبيولوجي..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-slate-300 text-[10px] sm:text-[11px] font-bold">العام الأكاديمي للتسليم والتاريخ :</label>
                                <input 
                                  type="text" 
                                  value={coverYear}
                                  onChange={(e) => setCoverYear(e.target.value)}
                                  placeholder="مثال: ١٤٤٥ هـ - ٢٠٢٤ م..."
                                  className="w-full bg-[#151b2a] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Tab Panel 1.5: Image Management controls (جديد ومميز جداً لتلبية الطلب!) */}
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
                        <div className="border-r-4 border-indigo-500 pr-3 flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-extrabold text-sm md:text-base">تحرير الصور واللوحات التوضيحية للتقرير 🖼️</h4>
                            <p className="text-slate-400 text-xs mt-1">تفريغ واستكشاف الصور المستخلصة في البحث، استبدالها برفع ملف من جهازك، أو إدراج روابط صور Unsplash دقيقة:</p>
                          </div>
                          <span className="bg-indigo-900/40 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
                            الصور المكتشفة: {docImages.length}
                          </span>
                        </div>

                        {/* Top: Existing Document Images list */}
                        <div className="bg-[#0b0e17] p-4 rounded-2xl border border-white/5 space-y-3">
                          <h5 className="text-white font-bold text-xs md:text-sm flex items-center gap-2 text-indigo-300">
                            <i className="fas fa-file-image"></i> الصور الفعالة بصلب المستند:
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
                                    <div className="flex-1 min-w-0 space-y-1.5">
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
                                        className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
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

                          {/* Appendix Toggle */}
                          <div className="border-t border-white/5 pt-4 mt-3">
                            <div className="border-r-4 border-indigo-500 pr-3">
                              <label className="flex items-center gap-3 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20 cursor-pointer text-[10px] sm:text-xs text-indigo-300 hover:bg-indigo-950/40 transition-all font-bold group">
                                <input 
                                  type="checkbox" 
                                  checked={showAppendixImages}
                                  onChange={(e) => setShowAppendixImages(e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                                />
                                <span className="flex-1">تفعيل صفحة الملحق (Appendix) في نهاية الملف</span>
                              </label>
                              <p className="text-[9px] text-slate-500 mt-1">عند تفعيله، سيتم إنشاء صفحة مستقلة بنهاية ملف الـ PDF تعرض كافة الصور والأشكال التوضيحية المرفقة.</p>
                            </div>
                          </div>

                          {/* Specific image config */}
                          {selectedImageIndex !== null && docImages[selectedImageIndex] && (
                            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl animate-in slide-in-from-top-1 duration-150 space-y-2.5">
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
                                    className="w-full bg-[#161f32] border border-white/5 rounded-xl px-2.5 py-1.5 text-white text-[11px] font-sans"
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
                          <h5 className="text-white font-bold text-xs md:text-sm flex items-center justify-between text-amber-400">
                            <span className="flex items-center gap-2">🕹️ مكتبة العلوم والرسومات واللوحات الموثوقة:</span>
                            <span className="text-[9px] text-slate-400">انقر فوق أي لوحة لإدراجها بصلب المستند</span>
                          </h5>

                          {/* Image Insertion Position Selector */}
                          <div className="bg-[#121824] p-3 rounded-xl border border-white/10 space-y-2">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                              <i className="fas fa-crosshairs text-indigo-400 ml-1"></i> موقع التركيب وإدراج الصورة في البحث:
                            </label>
                            <select
                              value={imgInsertPosition}
                              onChange={(e) => setImgInsertPosition(e.target.value)}
                              className="w-full bg-[#161f32] border border-white/5 rounded-lg px-2.5 py-1.5 text-white text-xs font-sans outline-none focus:border-indigo-500"
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
                          <div className="flex flex-wrap gap-1.5">
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
                                <div className="w-full h-[70px] bg-black rounded overflow-hidden relative">
                                  <img 
                                    src={item.url} 
                                    alt={item.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                                  />
                                </div>
                                <div className="text-[8px] text-slate-300 truncate mt-1 px-1 font-sans">{item.title}</div>
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

                          {/* Live search input */}
                          <div className="border-t border-white/5 pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">توليد والبحث عن الصور الذكية (بالذكاء الاصطناعي/إنجليزية):</label>
                              <span className="bg-indigo-500/20 text-indigo-300 text-[8px] px-1.5 py-0.5 rounded border border-indigo-500/30">AI Generated</span>
                            </div>
                            <input 
                              type="text"
                              value={imgSearchQuery}
                              onChange={(e) => setImgSearchQuery(e.target.value)}
                              placeholder="مثل: microchip, futuristic city, genome, robotic arm..."
                              className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                            />

                            {imgSearchQuery.trim().length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                                {[1, 2, 3, 4].map((id) => {
                                  const queryText = encodeURIComponent(imgSearchQuery.trim());
                                  // Using an amazing free AI image generator API allowing generating from prompt on the fly
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

                          <div className="border-t border-white/5 pt-3 space-y-2">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">إدراج صورة من مرجع أو مصدر موثوق (رابط خارجي/External URL):</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input 
                                type="text"
                                value={extImgInsertUrl}
                                onChange={(e) => setExtImgInsertUrl(e.target.value)}
                                placeholder="http://..."
                                className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                              />
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={extImgInsertAlt}
                                  onChange={(e) => setExtImgInsertAlt(e.target.value)}
                                  placeholder="وصف (اختياري)..."
                                  className="w-full bg-[#121824] border border-white/5 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (extImgInsertUrl) {
                                      handleInsertImage(extImgInsertUrl, extImgInsertAlt);
                                      setExtImgInsertUrl('');
                                      setExtImgInsertAlt('');
                                    }
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                                >
                                  إدراج مباشر
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3 space-y-2">
                            <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                              <i className="fas fa-upload text-indigo-400 ml-1"></i> رفع صورة من الجهاز (هاتف/كمبيوتر):
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
                                        setExtImgInsertAlt(''); // Reset after using
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = ''; // Reset
                                  }
                                }}
                                className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30 font-sans cursor-pointer"
                              />
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1">يُنصح بإضافة وصف (في خانة الوصف السابقة أعلاه) قبل اختيار الملف.</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tab Tab Panel 1: Presets selection */}
                  {activeSetupTab === 'presets' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">الهويات والقوالب الفنية الشاملة</h4>
                        <p className="text-slate-400 text-xs mt-1">تمنحك الأنماط الجاهزة تناسقًا علميًا فوريًا للخطوط والخلفيات بلمسة مصمم محترف:</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-1 custom-scrollbar">
                        {stylePresets.map(preset => {
                          const isActive = currentThemeId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => applyPreset(preset.id)}
                              className={`w-full text-right p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden gap-3 min-h-[140px] group ${
                                isActive
                                  ? 'bg-[#131b2e] border-indigo-500 shadow-lg shadow-indigo-950/50 scale-[1.01]'
                                  : 'bg-[#11141e] border-white/5 text-slate-300 hover:border-white/10 hover:bg-[#161a29]'
                              }`}
                              type="button"
                            >
                              <div className="flex items-start justify-between w-full">
                                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-sm transition-colors ${
                                  isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#1b2131] text-slate-400 group-hover:text-indigo-300'
                                }`}>
                                  <i className={preset.icon}></i>
                                </div>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold shadow animate-pulse">نشط حالياً</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 mt-1">
                                <span className="text-[11px] sm:text-xs font-black text-white block mb-1 group-hover:text-indigo-200 transition-colors">{preset.name}</span>
                                <p className="text-slate-400 text-[9px] sm:text-[10px] leading-relaxed line-clamp-2 md:line-clamp-none">{preset.theme.customSubtitle}</p>
                              </div>
                              <div className="flex gap-1.5 items-center mt-auto flex-wrap pt-2 border-t border-white/5">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-semibold flex items-center gap-1"><i className="fas fa-font"></i> {preset.theme.fontFamily}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-semibold">{preset.theme.baseFontSize} pt</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[8px] font-semibold">{preset.theme.columnCount || 1} أعمدة</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab Tab Panel 2: Typography & Spacing */}
                  {activeSetupTab === 'typography' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">خيارات الخطوط وعناصر الكتابة</h4>
                        <p className="text-slate-400 text-xs mt-1">تعديل أحجام الخطوط والتراكيب البصرية وتوزيع النصوص على المساحات البيضاء:</p>
                      </div>

                      {/* Font selection block */}
                      <div className="space-y-2 pt-2">
                        <label className="block text-slate-300 font-bold text-xs"><i className="fas fa-font text-[10px] text-indigo-400 ml-1"></i> الخط العربي المستخدم بالتقرير:</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {arabicFonts.map(font => (
                            <button
                              key={font.id}
                              onClick={() => {
                                setFontFamily(font.id);
                                setCurrentThemeId('custom');
                              }}
                              className={`px-3 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold border text-center transition-all cursor-pointer truncate ${
                                fontFamily === font.id
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/40'
                                  : 'bg-[#11141e] text-slate-300 border-white/5 hover:bg-[#161a29]'
                              }`}
                              style={{ fontFamily: font.id }}
                              type="button"
                              title={font.name}
                            >
                              {font.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Weight & Alignment Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Font Weight choice */}
                        <div className="space-y-1.5">
                          <label className="block text-slate-300 font-bold text-[11px] sm:text-xs">ثخن خط الفقرات (Font Weight):</label>
                          <select
                            value={fontWeight}
                            onChange={(e) => {
                              setFontWeight(e.target.value);
                              setCurrentThemeId('custom');
                            }}
                            className="w-full bg-[#11141e] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                          >
                            <option value="light">خفيف وأنيق (Light 300)</option>
                            <option value="normal">عادي رسمي موحد (Normal 400)</option>
                            <option value="medium">متوسط رصين (Medium 500)</option>
                            <option value="bold">عريض وجليات (Bold 700)</option>
                            <option value="black">سميك ومملوء (Black 900)</option>
                          </select>
                        </div>

                        {/* Alignment buttons */}
                        <div className="space-y-1.5">
                          <label className="block text-slate-300 font-bold text-[11px] sm:text-xs">محاذاة توزيع الأسطر بالصفحة:</label>
                          <div className="flex gap-1 bg-[#11141e] p-1 rounded-xl border border-white/5">
                            {[
                              { id: 'right', icon: 'fas fa-align-right', label: 'اليمين' },
                              { id: 'justify', icon: 'fas fa-align-justify', label: 'موزع بالتساوي' },
                              { id: 'center', icon: 'fas fa-align-center', label: 'توسيط' },
                            ].map((btn) => (
                              <button
                                key={btn.id}
                                onClick={() => {
                                  setTextAlignment(btn.id);
                                  setCurrentThemeId('custom');
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                  textAlignment === btn.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                                type="button"
                              >
                                <i className={btn.icon}></i>
                                <span>{btn.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Sizes sliders block */}
                      <div className="space-y-3.5 pt-3 border-t border-white/5">
                        {/* Main font size slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">حجم خط الفقرات ونصوص المحتوى المعياري:</span>
                            <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded">{baseFontSize} pt</span>
                          </div>
                          <input 
                            type="range" min="9" max="17" step="0.5"
                            value={baseFontSize}
                            onChange={(e) => {
                              setBaseFontSize(parseFloat(e.target.value));
                              setCurrentThemeId('custom');
                              setAutoFitPages('');
                            }}
                            className="w-full h-1 bg-[#1c2235] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1.5"
                          />
                        </div>

                        {/* Heading Font size */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">حجم خط العناوين الفرعية والمقاطع الكبيرة:</span>
                            <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded">{headingFontSize} pt</span>
                          </div>
                          <input 
                            type="range" min="14" max="28" step="0.5"
                            value={headingFontSize}
                            onChange={(e) => {
                              setHeadingFontSize(parseFloat(e.target.value));
                              setCurrentThemeId('custom');
                              setAutoFitPages('');
                            }}
                            className="w-full h-1 bg-[#1c2235] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1.5"
                          />
                        </div>

                        {/* Spacing lines */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">تباعد الأسطر الرأسي (Line Spacing):</span>
                            <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded">{lineHeight.toFixed(2)}x</span>
                          </div>
                          <input 
                            type="range" min="1.3" max="2.4" step="0.05"
                            value={lineHeight}
                            onChange={(e) => {
                              setLineHeight(parseFloat(e.target.value));
                              setCurrentThemeId('custom');
                              setAutoFitPages('');
                            }}
                            className="w-full h-1 bg-[#1c2235] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1.5"
                          />
                        </div>

                        {/* Paragraph margin */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-300">المسافة بين الفقرات (Paragraph Spacing):</span>
                            <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded">{paragraphSpacing} pt</span>
                          </div>
                          <input 
                            type="range" min="0" max="24" step="1"
                            value={paragraphSpacing}
                            onChange={(e) => {
                              setParagraphSpacing(parseFloat(e.target.value));
                              setCurrentThemeId('custom');
                              setAutoFitPages('');
                            }}
                            className="w-full h-1 bg-[#1c2235] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab Tab Panel 3: Colors Picker & Quick Palettes */}
                  {activeSetupTab === 'colors' && (
                    <div className="space-y-4 animate-in fade-in duration-250">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">خيارات الألوان وصبغات الهوية والمستند</h4>
                        <p className="text-slate-400 text-xs mt-1">خصص بدقة درجة تلوين وتناسق العناوين والخلفيات من خياراتنا:</p>
                      </div>

                      {/* Brand Palettes Quick selections */}
                      <div className="bg-[#11141e] p-3 rounded-2xl border border-white/5 space-y-2">
                        <span className="block text-[11px] text-indigo-300 font-bold">
                          <i className="fas fa-magic ml-1"></i> 
                          غسيل وتطبيق ألوان متناسقة بلمسة واحدة:
                        </span>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'الكلاسيكي الكحلي', headerBg: '#0f172a', accent: '#2563eb', text: '#1e293b', page: '#ffffff' },
                            { name: 'التمور الزمردي', headerBg: '#064e3b', accent: '#10b981', text: '#022c22', page: '#fafdfb' },
                            { name: 'الذهبي الأرجواني', headerBg: '#4c1d95', accent: '#b45309', text: '#2d0664', page: '#fdfbf7' },
                            { name: 'الكرزي الملكي', headerBg: '#881337', accent: '#e11d48', text: '#4c0519', page: '#fffbfc' },
                            { name: 'النخب الأبيض الهادئ', headerBg: '#1f2937', accent: '#6b7280', text: '#374151', page: '#ffffff' }
                          ].map((pal, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setH1Color(pal.headerBg);
                                setAccentColor(pal.accent);
                                setBodyTextColor(pal.text);
                                setPageBgColor(pal.page);
                                setTableHeaderBg(pal.headerBg);
                                setBlockquoteBg(`${pal.accent}08`);
                                setCurrentThemeId('custom');
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-white/5 bg-[#171b29] hover:bg-[#1d2336] text-[10px] text-white flex items-center gap-2 transition-all cursor-pointer"
                              type="button"
                            >
                              <span className="flex gap-0.5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: pal.headerBg }}></span>
                                <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: pal.accent }}></span>
                                <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: pal.page }}></span>
                              </span>
                              <span className="font-bold">{pal.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Granular Picker fields */}
                      <div className="grid grid-cols-2 gap-3.5 pt-2 max-h-[220px] overflow-y-auto p-0.5 custom-scrollbar">
                        {/* H1 headings */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون ترويسة الصفحة وجميع مستويات العناوين الأخرى (H1 - H6):</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={h1Color}
                              onChange={(e) => {
                                setH1Color(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={h1Color}
                              onChange={(e) => {
                                setH1Color(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>

                        {/* Base text */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون جميع النصوص، الفقرات، القوائم ومحتوى الجداول العادية:</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={bodyTextColor}
                              onChange={(e) => {
                                setBodyTextColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={bodyTextColor}
                              onChange={(e) => {
                                setBodyTextColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>

                        {/* Page background colors */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون أرضية خلفية الصفحة (A4):</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={pageBgColor}
                              onChange={(e) => {
                                setPageBgColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={pageBgColor}
                              onChange={(e) => {
                                setPageBgColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>

                        {/* Accent elements decoration */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون خط الفواصل والإبرازات والإطارات:</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={accentColor}
                              onChange={(e) => {
                                setAccentColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={accentColor}
                              onChange={(e) => {
                                setAccentColor(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>

                        {/* Table head headers */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">لون رؤوس أعمدة الجداول المعروضة:</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={tableHeaderBg}
                              onChange={(e) => {
                                setTableHeaderBg(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={tableHeaderBg}
                              onChange={(e) => {
                                setTableHeaderBg(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>

                        {/* Blockquote backdrops background */}
                        <div className="space-y-1">
                          <label className="block text-slate-300 text-[10px] font-bold">خلفية الاقتباسات والمقاطع الجانبية:</label>
                          <div className="flex items-center gap-2 bg-[#11141e] p-1.5 rounded-xl border border-white/5">
                            <input 
                              type="color" value={blockquoteBg}
                              onChange={(e) => {
                                setBlockquoteBg(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input 
                              type="text" value={blockquoteBg}
                              onChange={(e) => {
                                setBlockquoteBg(e.target.value);
                                setCurrentThemeId('custom');
                              }}
                              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none text-left"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab Tab Panel 4: Page layout & margins */}
                  {activeSetupTab === 'layout' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="border-r-4 border-indigo-500 pr-3">
                        <h4 className="text-white font-extrabold text-sm md:text-base">تخطيط وهوامش وعناصر مظهر الصفحة (A4 Designer)</h4>
                        <p className="text-slate-400 text-xs mt-1">تحديد الأبعاد، تقسيم محتوى الفقرات لأعمدة صحفية وإضافة حواشي الإطار:</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Orientation selection */}
                        <div className="space-y-1.5">
                          <label className="block text-[#b4c6e7] font-bold text-[11px] sm:text-xs">اتجاه تخطيط الصفحة للطباعة:</label>
                          <div className="flex bg-[#11141e] p-1 rounded-xl border border-white/5">
                            {[
                              { id: 'portrait', label: 'طولي (Portrait)', icon: 'fas fa-arrows-alt-v' },
                              { id: 'landscape', label: 'أفقي (Landscape)', icon: 'fas fa-arrows-alt-h' }
                            ].map(item => (
                              <button
                                key={item.id}
                                onClick={() => setPageOrientation(item.id as any)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                  pageOrientation === item.id 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                                type="button"
                              >
                                <i className={`${item.icon} text-xs mb-0.5`}></i>
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Columns split option */}
                        <div className="space-y-1.5">
                          <label className="block text-[#b4c6e7] font-bold text-[11px] sm:text-xs">تقسيم محتوى التقرير لأعمدة:</label>
                          <div className="flex bg-[#11141e] p-1 rounded-xl border border-white/5">
                            {[
                              { id: 1, label: 'مسار واحد ممتد (1 Col)', icon: 'fas fa-align-justify' },
                              { id: 2, label: 'مسارين صحفيين (2 Col)', icon: 'fas fa-columns' }
                            ].map(item => (
                              <button
                                key={item.id}
                                onClick={() => setColumnCount(item.id)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                  columnCount === item.id 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                                type="button"
                              >
                                <i className={`${item.icon} text-xs mb-0.5`}></i>
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        {/* Border frame style list */}
                        <div className="space-y-1.5">
                          <label className="block text-[#b4c6e7] font-bold text-[11px] sm:text-xs">نوع وحبكة خط الإطار الزوجي:</label>
                          <select
                            value={borderStyle}
                            onChange={(e) => {
                              setBorderStyle(e.target.value);
                              setCurrentThemeId('custom');
                            }}
                            className="w-full bg-[#11141e] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-bold"
                          >
                            <option value="double">مزدوج كلاسيكي أنيق (Double)</option>
                            <option value="solid">مستمر سميك (Solid)</option>
                            <option value="dashed">متقطع (Dashed)</option>
                            <option value="dotted">منقّط من المجمع (Dotted)</option>
                          </select>
                        </div>

                        {/* Margin slider */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-[#b4c6e7]">
                            <span>أحجام هوامش الصفحة الفارغة ( margins ):</span>
                            <span className="text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">{pageMargin} مم</span>
                          </div>
                          <input 
                            type="range" min="6" max="32" step="1"
                            value={pageMargin}
                            onChange={(e) => {
                              setPageMargin(parseInt(e.target.value));
                              setCurrentThemeId('custom');
                            }}
                            className="w-full h-1 bg-[#1c2235] rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2.5"
                          />
                        </div>
                      </div>

                      {/* Frame switches */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="block text-slate-300 text-[11px] sm:text-xs font-bold mb-1.5">تضمين أو إخفاء عناصر المستند الهيكلية:</label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Show Auto TOC check */}
                          <label className="flex items-center gap-3 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-500/20 cursor-pointer text-[10px] sm:text-xs text-indigo-300 hover:bg-indigo-950/40 transition-all font-bold group">
                            <input 
                              type="checkbox" checked={showAutoTOC}
                              onChange={(e) => setShowAutoTOC(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                            />
                            <span>إنشاء فهرس محتويات تلقائي (Auto TOC) <i className="fas fa-list-ol ml-1 text-indigo-400 group-hover:text-indigo-300"></i></span>
                          </label>

                          {/* Show header checkbox */}
                          <label className="flex items-center gap-3 bg-[#11141e]/50 p-2.5 rounded-xl border border-white/5 cursor-pointer text-[10px] sm:text-xs text-slate-300 hover:bg-[#11141e] transition-all">
                            <input 
                              type="checkbox" checked={showHeader}
                              onChange={(e) => setShowHeader(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                            />
                            <span>عرض ترويسة رئيسية بالعنوان بأعلى المستند</span>
                          </label>

                          {/* Show footer checkbox */}
                          <label className="flex items-center gap-3 bg-[#11141e]/50 p-2.5 rounded-xl border border-white/5 cursor-pointer text-[10px] sm:text-xs text-slate-300 hover:bg-[#11141e] transition-all">
                            <input 
                              type="checkbox" checked={showFooter}
                              onChange={(e) => setShowFooter(e.target.checked)}
                              className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                            />
                            <span>عرض تذييل الصفحة (الفوتر) بجانب التاريخ</span>
                          </label>

                          {/* Custom footer text input */}
                          {showFooter && (
                            <div className="bg-[#11141e]/50 p-3 rounded-xl border border-white/5 col-span-1 sm:col-span-2 space-y-1.5 animate-fadeIn">
                              <label className="block text-slate-300 font-bold text-[10px] sm:text-xs">تعديل نص التذييل (الفوتر) المصاحب لتاريخ التصدير:</label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                  type="text" 
                                  value={customFooterText}
                                  onChange={(e) => setCustomFooterText(e.target.value)}
                                  placeholder="اتركه فارغاً لضمان السرية، أو اكتب نصاً يمنع معرفة مصدر المستند..."
                                  className="flex-1 bg-[#161f32] border border-white/5 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 font-sans min-w-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCustomFooterText('')}
                                  className="px-3.5 py-2 rounded-xl text-[10px] bg-red-400/10 hover:bg-red-400/25 text-red-400 hover:text-white transition-all duration-150 font-bold shrink-0 border border-red-500/10 flex items-center justify-center gap-1.5 cursor-pointer select-none w-full sm:w-auto"
                                  title="حذف النص بالكامل من التذييل"
                                >
                                  <i className="fas fa-trash-alt text-[9px]"></i>
                                  <span>تفريغ النص</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Show border checkbox */}
                          <label className="flex items-center gap-3 bg-[#11141e]/50 p-2.5 rounded-xl border border-white/5 cursor-pointer text-[10px] sm:text-xs text-slate-300 hover:bg-[#11141e] transition-all col-span-1 sm:col-span-2">
                            <input 
                              type="checkbox" checked={showBorderFrame}
                              onChange={(e) => {
                                setShowBorderFrame(e.target.checked);
                                if (e.target.checked) setShowClassicBlackFrame(false);
                                setCurrentThemeId('custom');
                              }}
                              className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                            />
                            <span className="font-bold text-slate-200">إضافة إطار تجميل ملون حول الصفحة كاملة (Border Frame)</span>
                          </label>

                          {/* Show classic black border checkbox */}
                          <label className="flex items-center gap-3 bg-[#11141e]/50 p-2.5 rounded-xl border border-white/5 cursor-pointer text-[10px] sm:text-xs text-slate-300 hover:bg-[#11141e] transition-all col-span-1 sm:col-span-2">
                            <input 
                              type="checkbox" checked={showClassicBlackFrame}
                              onChange={(e) => {
                                setShowClassicBlackFrame(e.target.checked);
                                if (e.target.checked) setShowBorderFrame(false);
                                setCurrentThemeId('custom');
                              }}
                              className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">إضافة إطار كلاسيكي مربع أسود (Classic Black Frame)</span>
                              <span className="text-[10px] text-slate-400 font-normal mt-0.5">يرسم إطاراً مربعاً عتيقاً باللون الأسود الملكي المزدوج يمنح المستند هيبة الأطروحات والكتب المحققة المعتمدة.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Advanced Table Controls & Page Break Aesthetics */}
                      <div className="space-y-3 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs md:text-sm">
                          <i className="fas fa-table text-sm"></i>
                          <span>تنسيقات الجداول المتقدمة وخطوط الهيكل (Table Aesthetics) :</span>
                        </div>
                        <p className="text-slate-400 text-[10px] sm:text-xs">
                          تحكم بجمالية الجداول المدرجة، المسافات البينية داخل الخلايا، وتموج الأسطر لتسهيل قراءة البيانات:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {/* Striped toggle */}
                          <div className="bg-[#11141e]/50 p-3 rounded-xl border border-white/5 space-y-2">
                            <label className="flex items-center gap-2.5 cursor-pointer text-[10px] sm:text-xs font-bold text-slate-300">
                              <input 
                                type="checkbox" checked={tableStriped}
                                onChange={(e) => setTableStriped(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 bg-slate-800 border-white/10 rounded cursor-pointer accent-indigo-500"
                              />
                              <span>تلوين أسطر متباينة (Stripes)</span>
                            </label>
                            <p className="text-[9.5px] text-slate-400 leading-normal">
                              يعطي صفاً ملوناً هادئاً وصفاً أبيض لتسهيل تتبع الأرقام والبيانات في الجدول الكبير.
                            </p>
                          </div>

                          {/* Padding level */}
                          <div className="bg-[#11141e]/50 p-3 rounded-xl border border-white/5 space-y-2">
                            <label className="block text-slate-300 font-bold text-[10px] sm:text-xs">حشوة الخلايا (Cell Density):</label>
                            <select
                              value={tableCellPadding}
                              onChange={(e) => setTableCellPadding(e.target.value as any)}
                              className="w-full bg-[#11141e] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-[10.5px] sm:text-xs font-bold focus:outline-none"
                            >
                              <option value="small">مضغوطة جداً (Small Density)</option>
                              <option value="medium">متجانسة متناسقة (Default)</option>
                              <option value="large">فسيحة ومريحة (Comfortable)</option>
                            </select>
                          </div>

                          {/* Border intensity */}
                          <div className="bg-[#11141e]/50 p-3 rounded-xl border border-white/5 space-y-2">
                            <label className="block text-slate-300 font-bold text-[10px] sm:text-xs">تسطير الحدود والشبكة (Border Line):</label>
                            <select
                              value={tableBorderType}
                              onChange={(e) => setTableBorderType(e.target.value as any)}
                              className="w-full bg-[#11141e] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-[10.5px] sm:text-xs font-bold focus:outline-none"
                            >
                              <option value="full">شبكة تامة ملونة (Full Grid)</option>
                              <option value="horizontal">فواصل أفقية فقط (Row Dividers)</option>
                              <option value="light">خطوط رمادية رفيعة (Thin Borders)</option>
                              <option value="none">بدون حدود داخلية (Borderless)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Configurator Footer actions (RTL right-to-left layout) */}
              <div className="px-6 py-4 border-t border-white/5 bg-[#0b0e16] flex justify-between items-center">
                <button
                  onClick={() => applyPreset('standard')}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5"
                  type="button"
                >
                  إعادة تعيين للتلقائي ↺
                </button>
                <button
                  onClick={() => setShowAdvancedStyles(false)}
                  className="px-6 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
                  type="button"
                >
                  حفظ وتطبيق التغييرات فوريًا ✓
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Control Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#1e293b]/60">
          <div className="text-slate-400 text-xs hidden sm:block">
            <span>تاريخ التوليد: {todayFormatted}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 text-slate-300 font-bold text-[10px] md:text-xs transition-all border border-white/10 font-sans cursor-pointer whitespace-nowrap"
            >
              إلغاء وتجاهل التصدير
            </button>
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-[10px] md:text-xs shadow-sm active:scale-[0.98] transition-all flex items-center gap-1.5 border border-white/5 font-sans cursor-pointer whitespace-nowrap"
            >
              <i className="fas fa-file-pdf ml-2"></i>
              حفظ PDF
            </button>
            
          </div>
        </div>

      </div>
    </div>
  );
};
