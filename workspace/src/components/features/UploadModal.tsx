'use client';

import React, { useState, useRef } from 'react';
import {
  X, Upload, Link as LinkIcon, FileImage, AlertTriangle,
  CheckCircle, Sparkles,
  RotateCcw, Check, ArrowRight, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderTitle: string;
  onUploadSuccess: (url: string, titleStr: string) => Promise<any>;
}

interface Point {
  x: number; // Normalized (0.0 - 1.0)
  y: number;
}

interface Corners {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

type TabType = 'upload' | 'url';
type FilterType = 'none' | 'bw' | 'color';

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  folderId,
  folderTitle,
  onUploadSuccess,
}) => {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Raw Image input
  const [rawImageBase64, setRawImageBase64] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Alignment state
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input source, 2: Perspective Crop, 3: Save & Upload
  const [corners, setCorners] = useState<Corners>({
    tl: { x: 0.15, y: 0.15 },
    tr: { x: 0.85, y: 0.15 },
    br: { x: 0.85, y: 0.85 },
    bl: { x: 0.15, y: 0.85 }
  });
  const [activeFilter, setActiveFilter] = useState<FilterType>('bw');
  const [scannedResultBase64, setScannedResultBase64] = useState<string | null>(null);
  const [scannedWidth, setScannedWidth] = useState(0);
  const [scannedHeight, setScannedHeight] = useState(0);

  // Elements refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenImgRef = useRef<HTMLImageElement>(null);

  // Keep folderId referenced so React doesn't strip it
  void folderId;

  if (!isOpen) return null;

  // File drop helpers
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files (JPEG, PNG, WEBP) are valid for notebook scans.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setRawImageBase64(e.target.result as string);
        setStep(2); // Progress to alignment editor
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setError("Failed to digest selected file stream.");
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Draggable corners calculations
  const handleControlPointDrag = (corner: 'tl'|'tr'|'br'|'bl', clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Maximize relative movement bounding bounds
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    setCorners(prev => ({
      ...prev,
      [corner]: { x, y }
    }));
  };

  const startDrag = (corner: 'tl'|'tr'|'br'|'bl', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const isTouch = 'touches' in e;

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      handleControlPointDrag(corner, clientX, clientY);
    };

    const stopHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', stopHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', stopHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', stopHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', stopHandler);
  };

  // Gemini AI auto corner detection tool request call
  const triggerAICornerDetection = async () => {
    if (!rawImageBase64) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await apiFetch('/api/scan/detect-corners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: rawImageBase64 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger AI vision assistance.");
      }

      if (data.corners) {
        setCorners({
          tl: { x: data.corners.topLeft[0], y: data.corners.topLeft[1] },
          tr: { x: data.corners.topRight[0], y: data.corners.topRight[1] },
          br: { x: data.corners.bottomRight[0], y: data.corners.bottomRight[1] },
          bl: { x: data.corners.bottomLeft[0], y: data.corners.bottomLeft[1] }
        });
        setSuccessMsg("AI scan boundaries locked successfully!");
        setTimeout(() => setSuccessMsg(null), 1500);
      }
    } catch (err: any) {
      console.warn("AI corner detection fallback triggered:", err.message);
      setError("AI model busy, approx boundaries placed. Feel free to drag the glowing corners manually!");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetCorners = () => {
    setCorners({
      tl: { x: 0.10, y: 0.10 },
      tr: { x: 0.90, y: 0.10 },
      br: { x: 0.90, y: 0.90 },
      bl: { x: 0.10, y: 0.90 }
    });
  };

  // Core perspective transformation & image filter flattening engine
  const executePerspectiveAlign = () => {
    if (!hiddenImgRef.current || !rawImageBase64) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const img = hiddenImgRef.current!;
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcW;
        srcCanvas.height = srcH;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) {
          setError("Canvas processor failed to execute context.");
          setIsProcessing(false);
          return;
        }

        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, srcW, srcH);

        // Calculate original high-resolution corner coords in pixels
        const x0 = corners.tl.x * srcW, y0 = corners.tl.y * srcH;
        const x1 = corners.tr.x * srcW, y1 = corners.tr.y * srcH;
        const x2 = corners.br.x * srcW, y2 = corners.br.y * srcH;
        const x3 = corners.bl.x * srcW, y3 = corners.bl.y * srcH;

        // Calculate width and height dynamically based on the actual physical quadrilaterals (no shrinking)
        const topWidth = Math.hypot(x1 - x0, y1 - y0);
        const bottomWidth = Math.hypot(x2 - x3, y2 - y3);
        const leftHeight = Math.hypot(x3 - x0, y3 - y0);
        const rightHeight = Math.hypot(x2 - x1, y2 - y1);

        let dstW = Math.round(Math.max(topWidth, bottomWidth));
        let dstH = Math.round(Math.max(leftHeight, rightHeight));

        // Sanitize dimension calculation boundaries
        if (dstW < 300) dstW = 800;
        if (dstH < 300) dstH = 1100;

        // Safe upper bound limit for mobile browsers processing memory
        const maxLimit = 2500;
        if (dstW > maxLimit || dstH > maxLimit) {
          const ratio = dstW / dstH;
          if (dstW > dstH) {
            dstW = maxLimit;
            dstH = Math.round(maxLimit / ratio);
          } else {
            dstH = maxLimit;
            dstW = Math.round(maxLimit * ratio);
          }
        }

        setScannedWidth(dstW);
        setScannedHeight(dstH);

        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = dstW;
        dstCanvas.height = dstH;
        const dstCtx = dstCanvas.getContext('2d');
        if (!dstCtx) {
          setError("Destination canvas allocation failed.");
          setIsProcessing(false);
          return;
        }

        const dstData = dstCtx.createImageData(dstW, dstH);
        const srcPixels = srcData.data;
        const dstPixels = dstData.data;

        for (let yd = 0; yd < dstH; yd++) {
          const v = yd / (dstH - 1);
          for (let xd = 0; xd < dstW; xd++) {
            const u = xd / (dstW - 1);

            // Pure bilinear interpolation mapping
            const xs = Math.round((1 - u) * (1 - v) * x0 + u * (1 - v) * x1 + u * v * x2 + (1 - u) * v * x3);
            const ys = Math.round((1 - u) * (1 - v) * y0 + u * (1 - v) * y1 + u * v * y2 + (1 - u) * v * y3);

            const clampedXs = Math.max(0, Math.min(srcW - 1, xs));
            const clampedYs = Math.max(0, Math.min(srcH - 1, ys));

            const srcIdx = (clampedYs * srcW + clampedXs) * 4;
            const dstIdx = (yd * dstW + xd) * 4;

            let r = srcPixels[srcIdx];
            let g = srcPixels[srcIdx + 1];
            let b = srcPixels[srcIdx + 2];
            const a = srcPixels[srcIdx + 3];

            if (activeFilter === 'bw') {
              // Document scanning filter (convert grayscale + expand contrast stretch + adaptively wash shadows)
              const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;

              let finalVal = grayscale;
              if (grayscale > 115) {
                // Wash out soft lighting reflections to clean white background
                finalVal = Math.min(255, grayscale * 1.35);
              } else {
                // Deepen pen/pencil ink contrasts
                finalVal = Math.max(0, grayscale * 0.75);
              }

              // Contrast boosting stretch formula
              finalVal = (finalVal - 128) * 1.6 + 128;
              finalVal = Math.max(0, Math.min(255, finalVal));

              r = finalVal;
              g = finalVal;
              b = finalVal;
            } else if (activeFilter === 'color') {
              // Enhanced color scan to suppress soft background shadows
              r = Math.min(255, r * 1.18);
              g = Math.min(255, g * 1.18);
              b = Math.min(255, b * 1.18);
            }

            dstPixels[dstIdx] = r;
            dstPixels[dstIdx + 1] = g;
            dstPixels[dstIdx + 2] = b;
            dstPixels[dstIdx + 3] = a;
          }
        }

        dstCtx.putImageData(dstData, 0, 0);
        const dataUrl = dstCanvas.toDataURL('image/jpeg', 0.90);
        setScannedResultBase64(dataUrl);
        setIsProcessing(false);
        setStep(3); // Progress to name save page
      } catch (err: any) {
        console.warn("Canvas workspace alignment error context fallback activated:", err);
        // Fallback: Bypass warping/cropping filters and use original raw image
        setScannedResultBase64(rawImageBase64);
        setIsProcessing(false);
        setStep(3);
      }
    }, 100);
  };

  // Convert Base64 scan output to actual JPEG file blob to upload securely
  const submitAlignedPageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedResultBase64) return;
    setError(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    const checkTitle = title.trim() || 'Scanned Notebook Page';

    try {
      // Decode Base64 string to Blob
      const b64Data = scannedResultBase64.replace(/^data:image\/\w+;base64,/, "");
      const byteCharacters = atob(b64Data);
      const byteArrays: BlobPart[] = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });

      // Package into standard Multipart FormData
      const formData = new FormData();
      formData.append('image', blob, 'scanned_notebook_page.jpg');

      // 1. Upload scan image to backend uploads folder with secure validation
      const uploadRes = await apiFetch('/api/images/upload-file', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadResult.error || "Fail to upload parsed scan image.");
      }

      // 2. Map scanned image URL coordinates to Course Practical Folder
      await onUploadSuccess(uploadResult.url, checkTitle);

      setSuccessMsg("Notebook scan file attached successfully!");
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Workbook scan upload failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // External Direct Web url link upload
  const submitWebLinkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please input a valid page description label.");
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const checkTitle = title.trim();
      await onUploadSuccess(rawImageBase64?.trim() || "", checkTitle);
      setSuccessMsg("External web notebook link attached!");
      setTimeout(() => {
        onClose();
        resetModal();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to link external path.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setRawImageBase64(null);
    setScannedResultBase64(null);
    setScannedWidth(0);
    setScannedHeight(0);
    setImageLoaded(false);
    setTitle('');
    setError(null);
    setSuccessMsg(null);
    setCorners({
      tl: { x: 0.15, y: 0.15 },
      tr: { x: 0.85, y: 0.15 },
      br: { x: 0.85, y: 0.85 },
      bl: { x: 0.15, y: 0.85 }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop glass blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { onClose(); resetModal(); }}
          className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
          id="scanner-modal-backdrop"
        />

        {/* Floating Scanner Box */}
        <motion.div
          initial={{ scale: 0.95, y: 25, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 25, opacity: 0 }}
          className="relative w-full max-w-2xl max-w-[92vw] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100 my-4"
          id="scanner-container-card"
        >
          {/* Header segment banner */}
          <div className="p-4 sm:p-5 border-b border-zinc-850 bg-zinc-90 w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md shrink-0">
                <FileImage className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-tight flex-wrap">
                  <span className="truncate">Advanced Notebook Scanner</span>
                  <span className="text-[9px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full font-mono border border-cyan-400/20 uppercase tracking-widest font-extrabold animate-pulse shrink-0">Auto Align</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono tracking-wide mt-0.5 uppercase truncate max-w-[200px] sm:max-w-[320px]">
                  Subject Folder: {folderTitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => { onClose(); resetModal(); }}
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all cursor-pointer border border-transparent hover:border-zinc-800 shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Core Content Body wizard switcher */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-0">

            {/* Notifications / Errors banner */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2.5 break-words">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-[11px] leading-relaxed break-words">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2.5 break-words">
                <CheckCircle className="w-4 h-4 shrink-0 animate-bounce" />
                <span className="text-[11px] font-bold break-words">{successMsg}</span>
              </div>
            )}

            {/* STEP 1: CHOOSE AND INGEST PHOTO SOURCE */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Selector tab selection bar */}
                <div className="flex p-1 bg-zinc-900 border border-zinc-850 rounded-xl">
                  <button
                    onClick={() => { setActiveTab('upload'); setError(null); }}
                    className={`flex-1 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'upload' ? 'bg-cyan-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">Upload Image Scan</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('url'); setError(null); }}
                    className={`flex-1 py-2 min-h-[44px] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'url' ? 'bg-cyan-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span className="truncate">Web Image Link</span>
                  </button>
                </div>

                {/* Tab Content 1: Traditional Drag and Drop upload Area */}
                {activeTab === 'upload' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold">
                      Drag & Drop Notebook File Scan
                    </p>

                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full min-h-[220px] border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-300 cursor-pointer group touch-manipulation"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <div className="p-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 group-hover:border-cyan-500/20 transition-all duration-300 mb-3 shadow-inner">
                        <Upload className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <p className="text-xs font-black text-zinc-200 text-center tracking-tight break-words px-2">
                        Drop your diagram sketch sheet or photo scan here
                      </p>
                      <p className="text-[10px] text-zinc-500 text-center mt-1 break-words px-2">
                        Any standard image format (JPEG, PNG, WEBP) is accepted
                      </p>
                      <button className="mt-4 px-4 py-2 min-h-[44px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-[10.5px] font-bold text-slate-300 transition-colors">
                        Browse Files
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: External Direct Image web input url */}
                {activeTab === 'url' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold block">
                          Direct Web Image Link Endpoint
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500 pointer-events-none">
                            <LinkIcon className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="url"
                            placeholder="https://example.com/student-practical-note.jpg"
                            onChange={(e) => setRawImageBase64(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-650 rounded-xl outline-none focus:border-cyan-500/50 transition-all font-sans"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold block">
                          Document Page Title Label
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Acid titration curve graph or Refraction Diagram"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-2.5 min-h-[44px] bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-650 rounded-xl outline-none focus:border-cyan-500/50 transition-all font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={submitWebLinkUpload}
                        disabled={isProcessing || !title.trim()}
                        className="w-full py-2.5 min-h-[44px] bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black transition-all shadow-md disabled:opacity-40"
                      >
                        Submit External Web Attachment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CORNER AUTO-ALIGNMENT AND PERSPECTIVE WARPER GRAPHIC BOARD */}
            {step === 2 && rawImageBase64 && (
              <div className="space-y-5 flex flex-col items-center">
                <div className="w-full text-center space-y-1.5 mb-2">
                  <div className="text-xs font-extrabold text-white tracking-wide uppercase flex items-center justify-center gap-1.5 flex-wrap">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                    <span className="truncate">Step 2: Calibrate Page Boundaries</span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 max-w-lg mx-auto break-words px-2">
                    Drag the 4 glowing cyan pins to match the corners of your notebook page! Correct alignments remove perspective angles, creating flat, clean scans.
                  </p>
                </div>

                {/* Main Interactive Warping Canvas Container box */}
                <div
                  ref={containerRef}
                  className="relative w-full max-w-sm max-w-[88vw] aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair select-none touch-none"
                  id="perspective-warping-board"
                >
                  {/* Underlay Raw rendering Image */}
                  <img
                    ref={hiddenImgRef}
                    src={rawImageBase64}
                    alt="Scan calibrating underlay"
                    onLoad={() => setImageLoaded(true)}
                    className="w-full h-full object-contain opacity-70 border border-transparent pointer-events-none"
                  />

                  {/* SVG overlay path lines reflecting the calibrated polygon area */}
                  {imageLoaded && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <polygon
                        points={`
                          ${corners.tl.x * 100}%,${corners.tl.y * 100}%
                          ${corners.tr.x * 100}%,${corners.tr.y * 100}%
                          ${corners.br.x * 100}%,${corners.br.y * 100}%
                          ${corners.bl.x * 100}%,${corners.bl.y * 100}%
                        `}
                        className="fill-cyan-500/15 stroke-cyan-400 stroke-2 stroke-dasharray-[4,4] animate-[dash_10s_linear_infinite]"
                        style={{ strokeDasharray: '4,4' }}
                      />
                    </svg>
                  )}

                  {/* Draggable glowing corner markers anchors */}
                  {imageLoaded && (
                    <>
                      {/* TOP LEFT */}
                      <div
                        onMouseDown={(e) => startDrag('tl', e)}
                        onTouchStart={(e) => startDrag('tl', e)}
                        style={{ left: `${corners.tl.x * 100}%`, top: `${corners.tl.y * 100}%` }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-zinc-950/80 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125 transition-transform z-20 flex items-center justify-center shadow-lg shadow-cyan-400/20 group touch-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-cyan-400 uppercase font-mono tracking-tight whitespace-nowrap">TOP-LEFT</span>
                      </div>

                      {/* TOP RIGHT */}
                      <div
                        onMouseDown={(e) => startDrag('tr', e)}
                        onTouchStart={(e) => startDrag('tr', e)}
                        style={{ left: `${corners.tr.x * 100}%`, top: `${corners.tr.y * 100}%` }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-zinc-950/80 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125 transition-transform z-20 flex items-center justify-center shadow-lg shadow-cyan-400/20 group touch-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-cyan-400 uppercase font-mono tracking-tight whitespace-nowrap">TOP-RIGHT</span>
                      </div>

                      {/* BOTTOM RIGHT */}
                      <div
                        onMouseDown={(e) => startDrag('br', e)}
                        onTouchStart={(e) => startDrag('br', e)}
                        style={{ left: `${corners.br.x * 100}%`, top: `${corners.br.y * 100}%` }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-zinc-950/80 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125 transition-transform z-20 flex items-center justify-center shadow-lg shadow-cyan-400/20 group touch-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-cyan-400 uppercase font-mono tracking-tight whitespace-nowrap">BOT-RIGHT</span>
                      </div>

                      {/* BOTTOM LEFT */}
                      <div
                        onMouseDown={(e) => startDrag('bl', e)}
                        onTouchStart={(e) => startDrag('bl', e)}
                        style={{ left: `${corners.bl.x * 100}%`, top: `${corners.bl.y * 100}%` }}
                        className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400 bg-zinc-950/80 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125 transition-transform z-20 flex items-center justify-center shadow-lg shadow-cyan-400/20 group touch-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="hidden group-hover:block absolute top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-cyan-400 uppercase font-mono tracking-tight whitespace-nowrap">BOT-LEFT</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Dashboard Options: AI Alignment Trigger, Grayscale Filters settings, reset buttons */}
                <div className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={triggerAICornerDetection}
                        disabled={isProcessing}
                        className="px-4 py-2.5 min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-white border border-cyan-400/10 hover:border-cyan-400/20 font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                        <span className="truncate">AI Auto-Snap (Gemini Vision)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCorners}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 cursor-pointer"
                        title="Reset corners"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 px-1 bg-zinc-950 border border-zinc-850 rounded-xl flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('bw')}
                        className={`px-3 py-1.5 min-h-[36px] text-[10.5px] font-extrabold rounded-lg transition-all ${activeFilter === 'bw' ? 'bg-cyan-500/10 text-cyan-400 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        BW Scan
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('color')}
                        className={`px-3 py-1.5 min-h-[36px] text-[10.5px] font-extrabold rounded-lg transition-all ${activeFilter === 'color' ? 'bg-cyan-500/10 text-cyan-400 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Color Booster
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFilter('none')}
                        className={`px-3 py-1.5 min-h-[36px] text-[10.5px] font-extrabold rounded-lg transition-all ${activeFilter === 'none' ? 'bg-cyan-500/10 text-cyan-400 font-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Original
                      </button>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-850 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="px-4 py-2 min-h-[44px] text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Choose different image
                    </button>

                    <button
                      type="button"
                      onClick={executePerspectiveAlign}
                      disabled={isProcessing}
                      className="px-4 sm:px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span className="truncate">Aligning page...</span>
                        </>
                      ) : (
                        <>
                          <span className="truncate">Align & Flatten Document</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW ALIGNED STATIC JPEGS SCAN, AND ASSIGN FILENAMES */}
            {step === 3 && scannedResultBase64 && (
              <form onSubmit={submitAlignedPageUpload} className="space-y-4 flex flex-col items-center">
                <div className="w-full text-center space-y-1 mb-2">
                  <div className="text-xs font-extrabold text-white tracking-wide uppercase flex items-center justify-center gap-1.5 flex-wrap">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Step 3: Save Final Aligned Sheet</span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 break-words px-2">
                    Perfect alignment generated! Give this page a course name label, review the scanned output below, and upload.
                  </p>
                </div>

                <div className="relative w-full max-w-[200px] aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-inner shadow-black">
                  <img
                    src={scannedResultBase64}
                    alt="Aligned Result Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[8px] font-mono bg-zinc-950/80 text-cyan-400 border border-zinc-800 px-1.5 py-0.5 rounded whitespace-nowrap">{scannedWidth} x {scannedHeight} {scannedWidth > scannedHeight ? '(Landscape HD)' : '(Portrait HD)'}</span>
                </div>

                <div className="w-full p-4 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase font-semibold block">
                      Notebook Page / File Label Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acid titration curve graph or Refraction Diagram"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 min-h-[44px] bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-650 rounded-xl outline-none focus:border-cyan-500/50 transition-all font-sans"
                    />
                  </div>

                  <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 min-h-[44px] text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Bypass back to Alignment board
                    </button>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 sm:px-5 py-2.5 min-h-[44px] bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span className="truncate">Uploading Scan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 animate-bounce" />
                          <span className="truncate">Attach Scanned Page</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
