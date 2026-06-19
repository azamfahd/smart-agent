export const validateAndFixTable = (
    headers: any[],
    rows: any[][]
): { headers: any[], rows: any[][] } => {
    let maxCols = headers.length;
    for (const row of rows) {
        maxCols = Math.max(maxCols, row.length);
    }

    // Fix headers
    const fixedHeaders = [...headers];
    while (fixedHeaders.length < maxCols) {
        fixedHeaders.push(' ');
    }

    // Fix rows
    const fixedRows = rows.map(row => {
        const fixedRow = [...row];
        while (fixedRow.length < maxCols) {
            fixedRow.push(' ');
        }
        return fixedRow.slice(0, maxCols); // Ensure not more than max columns
    });
    
    return { headers: fixedHeaders, rows: fixedRows };
};
