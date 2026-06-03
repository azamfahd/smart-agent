import * as fs from 'fs';

let content = fs.readFileSync('components/ResearchWorkspace.tsx', 'utf8');

const targetStr = `              <div className={\`space-y-10 \${fontSizeClasses} \${lineHeightStyle}\`}>
                
                {/* 1. Abstract (Academic style: center indented, no background colorful borders, clean typography) */}
                <div className="my-10 mx-6 text-center" >
                  <h2 className="text-base font-bold text-slate-900 mb-4 text-center tracking-normal font-sans">{sectionLabels.abstract}</h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif italic text-xs px-10 border-r border-l border-slate-200">
                    {renderAcademicMarkdown(doc.abstract, true) || 'لم يتم إدخال ملخص للبحث حتى الآن.'}
                  </div>
                </div>

                {/* Dynamic Table of Contents (Academic Style: dotted line layout, zero dashboard borders) */}
                {doc.showTableOfContents && (
                  <div className="border-t border-b border-slate-300 py-6 my-10 font-serif" style={{ pageBreakInside: 'avoid' }}>
                    <h2 className="text-sm font-bold text-slate-950 mb-6 text-center font-sans tracking-wide">{activeAgent?.id === "ACADEMIC" ? "فهرس محتويات الورقة الأكاديمية" : activeAgent?.id === "CODER" ? "فهرس المستند التقني" : "فهرس المحتويات"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-xs font-serif text-slate-700">`;

const replaceStr = `              <div className={\`space-y-6 md:space-y-10 \${fontSizeClasses} \${lineHeightStyle} px-2 md:px-0\`}>
                
                {/* 1. Abstract (Academic style: center indented, no background colorful borders, clean typography) */}
                <div className="my-8 md:my-10 mx-2 md:mx-6 text-center" >
                  <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-4 text-center tracking-normal font-sans">{sectionLabels.abstract}</h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif italic text-xs md:text-sm px-4 md:px-10 border-r border-l border-slate-200">
                    {renderAcademicMarkdown(doc.abstract, true) || 'لم يتم إدخال ملخص للبحث حتى الآن.'}
                  </div>
                </div>

                {/* Dynamic Table of Contents (Academic Style: dotted line layout, zero dashboard borders) */}
                {doc.showTableOfContents && (
                  <div className="border-t border-b border-slate-300 py-6 my-8 md:my-10 font-serif" style={{ pageBreakInside: 'avoid' }}>
                    <h2 className="text-sm md:text-base font-bold text-slate-950 mb-4 md:mb-6 text-center font-sans tracking-wide">{activeAgent?.id === "ACADEMIC" ? "فهرس محتويات الورقة الأكاديمية" : activeAgent?.id === "CODER" ? "فهرس المستند التقني" : "فهرس المحتويات"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-12 gap-y-4 text-xs md:text-sm font-serif text-slate-700">`;

content = content.replace(targetStr, replaceStr);

const targetStr2 = `                {/* 2. Introduction (Academic Style) */}
                <div className="space-y-3" >
                  <h2 className="text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.intro}</span>
                    <span className="text-slate-400 text-xs font-mono select-none font-bold">1.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif text-sm">`;

const replaceStr2 = `                {/* 2. Introduction (Academic Style) */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.intro}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">1.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">`;

content = content.replace(targetStr2, replaceStr2);


const targetStr3 = `                {/* 3. Methodology */}
                <div className="space-y-3" >
                  <h2 className="text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.methodology}</span>
                    <span className="text-slate-400 text-xs font-mono select-none font-bold">2.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif text-sm">`;

const replaceStr3 = `                {/* 3. Methodology */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.methodology}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">2.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">`;

content = content.replace(targetStr3, replaceStr3);

const targetStr4 = `                {/* 4. Results & Discussion */}
                <div className="space-y-3" >
                  <h2 className="text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.results}</span>
                    <span className="text-slate-400 text-xs font-mono select-none font-bold">3.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif text-sm">`;

const replaceStr4 = `                {/* 4. Results & Discussion */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.results}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">3.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">`;

content = content.replace(targetStr4, replaceStr4);

const targetStr5 = `                {/* 5. Conclusion */}
                <div className="space-y-3" >
                  <h2 className="text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.conclusion}</span>
                    <span className="text-slate-400 text-xs font-mono select-none font-bold">4.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif text-sm">`;

const replaceStr5 = `                {/* 5. Conclusion */}
                <div className="space-y-3" >
                  <h2 className="text-sm md:text-base font-bold text-slate-950 border-b border-slate-200 pb-2 flex items-center justify-between font-sans">
                    <span>{sectionLabels.conclusion}</span>
                    <span className="text-slate-400 text-[10px] md:text-xs font-mono select-none font-bold">4.0</span>
                  </h2>
                  <div className="text-justify text-slate-800 leading-relaxed font-serif">`;

content = content.replace(targetStr5, replaceStr5);

const targetStr6 = `                {/* 6. References */}
                <div className="pt-6 mt-12 border-t border-slate-300 font-serif">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">`;

const replaceStr6 = `                {/* 6. References */}
                <div className="pt-6 mt-12 border-t border-slate-300 font-serif px-2 md:px-0">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm md:text-base font-bold text-slate-900 font-sans flex items-center gap-2">`;

content = content.replace(targetStr6, replaceStr6);

fs.writeFileSync('components/ResearchWorkspace.tsx', content, 'utf8');
