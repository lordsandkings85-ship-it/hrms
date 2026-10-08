export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number';
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  totalsRow?: boolean;
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  totalsRow?: boolean;
  footnote?: string;
}

export interface ExcelMultiSheetOptions {
  filename: string;
  sheets: ExcelSheet[];
}

function colLetter(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function cellValue(v: unknown, type?: ExcelColumn['type']): string | number {
  if (type === 'number') {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return v == null ? '' : String(v);
}

function styleHeader(headerRow: any): void {
  headerRow.height = 20;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell: any) => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3730A3' } },
    };
  });
}

export function appendSheet(wb: any, sheet: ExcelSheet): void {
  const ws = wb.addWorksheet(sheet.name.length > 31 ? sheet.name.slice(0, 31) : sheet.name);
  ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  for (const row of sheet.rows) {
    const values: (string | number)[] = sheet.columns.map((c) => cellValue(row[c.key], c.type));
    ws.addRow(values);
  }

  // Data ends here: header + one row per record. Captured before any footnote rows are
  // appended, so totals formulas can't accidentally span the spacer/footnote.
  const lastDataRow = ws.rowCount;

  styleHeader(ws.getRow(1));

  if (sheet.footnote) {
    ws.addRow([]);
    ws.addRow([sheet.footnote]);
    const noteRow = ws.getRow(ws.rowCount);
    noteRow.eachCell((cell: any) => {
      cell.font = { italic: true, color: { argb: 'FF6B7280' } };
    });
  }

  if (sheet.totalsRow) {
    const total = ws.addRow([]);
    total.getCell(1).value = 'Total';
    total.font = { bold: true };
    total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    sheet.columns.forEach((c, i) => {
      if (c.type === 'number') {
        const letter = colLetter(i);
        const sum = sheet.rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
        total.getCell(i + 1).value = {
          formula: `SUM(${letter}2:${letter}${lastDataRow})`,
          result: sum,
        };
      }
    });
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };
}

export async function downloadXlsxMultiSheet(options: ExcelMultiSheetOptions): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  for (const sheet of options.sheets) {
    appendSheet(wb, sheet);
  }
  const buf: any = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = /\.xlsx$/i.test(options.filename) ? options.filename : `${options.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Quick CSV export with a UTF-8 BOM so Excel opens non-Latin text correctly. */
export function downloadCsv(options: { filename: string; columns: ExcelColumn[]; rows: Record<string, unknown>[] }): void {
  const escape = (value: string): string => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const header = options.columns.map((c) => escape(c.header)).join(',');
  const lines = options.rows.map((row) =>
    options.columns.map((c) => escape(cellValue(row[c.key], c.type).toString())).join(','),
  );
  const csv = `\uFEFF${[header, ...lines].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = /\.csv$/i.test(options.filename) ? options.filename : `${options.filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(options: ExcelExportOptions): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(options.sheetName || 'Export');

  ws.columns = options.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  for (const row of options.rows) {
    const values: (string | number)[] = options.columns.map((c) => {
      const v = row[c.key];
      if (c.type === 'number') {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return v == null ? '' : String(v);
    });
    ws.addRow(values);
  }

  const lastDataRow = ws.rowCount;

  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF3730A3' } },
    };
  });

  if (options.totalsRow) {
    const total = ws.addRow([]);
    total.getCell(1).value = 'Total';
    total.font = { bold: true };
    total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    options.columns.forEach((c, i) => {
      if (c.type === 'number') {
        const letter = colLetter(i);
        const sum = options.rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
        total.getCell(i + 1).value = {
          formula: `SUM(${letter}2:${letter}${lastDataRow})`,
          result: sum,
        };
      }
    });
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: options.columns.length },
  };

  const buf: any = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = /\.xlsx$/i.test(options.filename) ? options.filename : `${options.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}