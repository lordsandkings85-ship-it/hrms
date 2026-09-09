import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerInit: Promise<void> | null = null;

async function initWorker(): Promise<void> {
  if (workerInit) return workerInit;
  workerInit = (async () => {
    try {
      GlobalWorkerOptions.workerSrc = workerSrc;
      return;
    } catch {
      const res = await fetch(workerSrc);
      const code = await res.text();
      GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    }
  })();
  return workerInit;
}

/**
 * Renders every page of a PDF (blob / http URL) onto canvases sized to `targetWidth`.
 * Works identically in browser and Electron, without relying on Chromium's embedded
 * PDF viewer (which is blocked inside iframes by the desktop app sandbox/CSP).
 */
export async function renderPdfPagesToCanvas(pdfUrl: string, targetWidth: number): Promise<HTMLCanvasElement[]> {
  await initWorker();

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error('Could not load the payslip PDF.');
  const data = new Uint8Array(await res.arrayBuffer());

  const task = getDocument({ data });
  const doc = await task.promise;
  const canvases: HTMLCanvasElement[] = [];
  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(0.5, (targetWidth - 24) / base.width);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering is not supported here.');

      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
    }
  } finally {
    await task.destroy();
  }
  return canvases;
}