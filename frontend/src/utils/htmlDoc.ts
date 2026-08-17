export function downloadHtmlDoc(filename: string, html: string, mime = 'application/msword'): void {
  const full = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><style>
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; color: #1f2937; }
    h1 { font-size: 20px; margin: 0 0 2px; }
    .muted { color: #6b7280; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
    th { background: #f3f4f6; }
    .right { text-align: right; }
    .total td { font-weight: bold; background: #fef3f2; }
    .sig { margin-top: 56px; }
  </style></head><body>${html}</body></html>`;
  const blob = new Blob(['\ufeff' + full], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
