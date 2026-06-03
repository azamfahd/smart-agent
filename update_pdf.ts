import * as fs from 'fs';

const filePath = 'components/ResearchWorkspace.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We need to inject the table state in renderAcademicMarkdown
const stateAdditions = `
    let listItems: React.ReactNode[] = [];
    let listType: 'bullet' | 'numeric' | null = null;
    let tableRows: React.ReactNode[][] = [];
    let tableHeaders: React.ReactNode[] = [];
    let insideTable = false;
    const renderedElements: React.ReactNode[] = [];

    const flushTable = (keyPrefix: string) => {
      if (tableRows.length > 0 || tableHeaders.length > 0) {
        renderedElements.push(
          <div key={\`table-wrapper-\${keyPrefix}\`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm" style={{ pageBreakInside: 'avoid' }}>
            <table className="w-full text-sm text-right text-slate-800 border-collapse">
              {tableHeaders.length > 0 && (
                <thead className="text-xs uppercase font-bold text-slate-700 bg-slate-50 border-b border-slate-200">
                  <tr>
                    {tableHeaders.map((hdr, idx) => (
                      <th key={idx} className="px-5 py-3 border-l border-slate-200 last:border-0">{hdr}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b transition-colors border-slate-100 hover:bg-slate-50/70 last:border-0">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-5 py-3 leading-relaxed border-l border-slate-100 last:border-0 text-justify">{cell}</td>
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
`;

content = content.replace(
  /let listItems: React\.ReactNode\[\] = \[\];\n\s*let listType: 'bullet' \| 'numeric' \| null = null;\n\s*const renderedElements: React\.ReactNode\[\] = \[\];/,
  stateAdditions
);

const flowBreakers = [
    "flushList(uniqueKey);",
];
for(const breaker of flowBreakers) {
    content = content.replace(new RegExp(breaker.replace(/[.*+?^$\\{}()[\]\\]/g, '\\$&'), 'g'), breaker + "\n        flushTable(uniqueKey);");
}

content = content.replace(
    /flushList\(\`final-\$\{lines\.length\}\`\);/,
    `flushList(\`final-\${lines.length}\`);\n    flushTable(\`final-\${lines.length}\`);`
);

const tableDetection = `
      // Check tables
      const tableMatch = trimmed.match(/^\\|(.+)\\|$/);
      if (tableMatch) {
        if (!trimmed) {
          flushList(uniqueKey);
          flushTable(uniqueKey);
          renderedElements.push(<div key={uniqueKey} className="h-2"></div>);
          return;
        }

        const rowContent = tableMatch[1];
        // match separators like |---|---|
        if (/^[\\-\\|\\s:]+$/.test(rowContent)) {
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
`;

content = content.replace(
    /const uniqueKey = \`acad-\$\{lineIdx\}\`;/,
    `const uniqueKey = \`acad-\${lineIdx}\`;\n${tableDetection}`
);

fs.writeFileSync(filePath, content, 'utf8');
