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
        const lastDataRow = ws.rowCount - 1;
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