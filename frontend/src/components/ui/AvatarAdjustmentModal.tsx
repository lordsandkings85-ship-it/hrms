import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Check,
  Move,
  FlipHorizontal,
  Sliders,
} from 'lucide-react';

export interface AvatarAdjustmentModalProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (adjustedDataUrl: string) => void;
}

export function AvatarAdjustmentModal({
  open,
  imageSrc,
  onClose,
  onSave,
}: AvatarAdjustmentModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewLargeRef = useRef<HTMLCanvasElement | null>(null);
  const previewSmallRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Reset state when opening with a new image
  useEffect(() => {
    if (open && imageSrc) {
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        loadedImageRef.current = img;
        draw();
      };
      img.src = imageSrc;
    } else {
      loadedImageRef.current = null;
    }
  }, [open, imageSrc]);

  // Main drawing routine onto the interactive canvas and previews
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width; // 320x320
    ctx.clearRect(0, 0, size, size);

    // Background dark grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Save context for image transformation
    ctx.save();
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);

    // Calculate base fit (cover fit)
    const imgRatio = img.width / img.height;
    let baseW = size;
    let baseH = size;
    if (imgRatio > 1) {
      baseW = size * imgRatio;
      baseH = size;
    } else {
      baseW = size;
      baseH = size / imgRatio;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw circular & rounded crop overlay mask
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, size, size);

    // Cut out circle in center
    const radius = size * 0.44;
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    // Draw guide circle ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle crosshair / center alignment guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(size / 2 - 16, size / 2);
    ctx.lineTo(size / 2 + 16, size / 2);
    ctx.moveTo(size / 2, size / 2 - 16);
    ctx.lineTo(size / 2, size / 2 + 16);
    ctx.stroke();
    ctx.restore();

    // Update Mini Previews
    updatePreviews(img, zoom, rotation, flipH, offset);
  }, [zoom, rotation, flipH, offset]);

  // Update mini live previews
  const updatePreviews = (
    img: HTMLImageElement,
    z: number,
    rot: number,
    fh: boolean,
    off: { x: number; y: number }
  ) => {
    [previewLargeRef.current, previewSmallRef.current].forEach((previewCanvas) => {
      if (!previewCanvas) return;
      const pCtx = previewCanvas.getContext('2d');
      if (!pCtx) return;

      const pSize = previewCanvas.width;
      pCtx.clearRect(0, 0, pSize, pSize);

      pCtx.save();
      const scaleFactor = pSize / (canvasRef.current?.width || 320);
      pCtx.translate(pSize / 2 + off.x * scaleFactor, pSize / 2 + off.y * scaleFactor);
      pCtx.rotate((rot * Math.PI) / 180);
      if (fh) pCtx.scale(-1, 1);

      const imgRatio = img.width / img.height;
      let baseW = pSize;
      let baseH = pSize;
      if (imgRatio > 1) {
        baseW = pSize * imgRatio;
        baseH = pSize;
      } else {
        baseW = pSize;
        baseH = pSize / imgRatio;
      }

      const drawW = baseW * z;
      const drawH = baseH * z;

      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = 'high';
      pCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      pCtx.restore();
    });
  };

  useEffect(() => {
    if (loadedImageRef.current) {
      draw();
    }
  }, [draw]);

  // Mouse / Touch handlers for dragging / panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => Math.min(3, Math.max(0.6, Number((prev + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setOffset({ x: 0, y: 0 });
  };

  // Generate high-resolution cropped base64 output (400x400)
  const handleApply = () => {
    const img = loadedImageRef.current;
    if (!img) return;

    const outSize = 400;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, outSize, outSize);

    // Scale offset and base dimensions to output resolution
    const viewSize = canvasRef.current?.width || 320;
    const scaleFactor = outSize / viewSize;

    ctx.save();
    ctx.translate(outSize / 2 + offset.x * scaleFactor, outSize / 2 + offset.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);

    const imgRatio = img.width / img.height;
    let baseW = outSize;
    let baseH = outSize;
    if (imgRatio > 1) {
      baseW = outSize * imgRatio;
      baseH = outSize;
    } else {
      baseW = outSize;
      baseH = outSize / imgRatio;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const finalDataUrl = outCanvas.toDataURL('image/png');
    onSave(finalDataUrl);
    onClose();
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Adjust Employee Avatar
              </h3>
              <p className="text-xs text-slate-400">
                Drag to reposition, zoom or rotate for a perfect portrait.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Main interactive viewport */}
          <div className="flex flex-col items-center gap-3">
            <div
              className={`relative rounded-3xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner select-none cursor-${
                isDragging ? 'grabbing' : 'grab'
              }`}
              style={{ width: 280, height: 280 }}
            >
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full h-full object-contain"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/70 text-[10px] text-white/80 pointer-events-none flex items-center gap-1">
                <Move size={10} /> Drag to pan
              </div>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Rotate 90° Left"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Rotate 90° Right"
              >
                <RotateCw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setFlipH((f) => !f)}
                className={`p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                  flipH ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold' : ''
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal size={15} />
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-[11px] font-semibold"
                title="Reset Position & Zoom"
              >
                <RefreshCw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Controls & Live Previews */}
          <div className="flex flex-col gap-5 flex-1 min-w-[200px] w-full">
            {/* Zoom Slider Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-teal-500" /> Zoom Level
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min="0.6"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-teal-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            {/* Live Previews Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Live Previews
              </span>
              <div className="flex items-center justify-around gap-4 pt-1">
                {/* Large Passport Card Preview */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-18 h-18 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-slate-700 bg-slate-900">
                    <canvas
                      ref={previewLargeRef}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Passport Card</span>
                </div>

                {/* Circular Badge / Table Preview */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm border-2 border-white dark:border-slate-700 bg-slate-900">
                    <canvas
                      ref={previewSmallRef}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Directory & Table</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/20 transition-all hover:scale-102 cursor-pointer"
          >
            <Check size={15} /> Apply & Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
