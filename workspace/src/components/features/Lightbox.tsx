'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { safeLocalStorage } from '@/lib/storage';
import { FormattedMarkdown } from './FormattedMarkdown';
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Cpu,
  BookOpen,
  MessageSquare,
  Send,
  HelpCircle,
  FlaskConical,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface LightboxProps {
  images: { url: string; title?: string }[];
  initialIndex: number;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ images, initialIndex, onClose }) => {
  const { apiFetch, user, setUser, geminiApiKey, setIsKeyModalOpen, language } = useAuth();

  // Carousel states
  const [index, setIndex] = useState(initialIndex);
  // Pinch-to-zoom + pan system (touch gesture based, no buttons)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  // Pinch tracking
  const pinchRef = useRef({ startDist: 0, startZoom: 1 });
  const lastTapRef = useRef(0);

  // Reset zoom/pan when switching images
  useEffect(() => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  }, [index]);

  const resetZoom = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  // Double-tap / double-click to toggle zoom (1x ↔ 2.5x)
  const handleImageClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      setZoomLevel((prev) => {
        if (prev > 1) {
          setPanX(0);
          setPanY(0);
          return 1;
        }
        return 2.5;
      });
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // Mouse drag to pan (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanX(dragStartRef.current.panX + dx);
    setPanY(dragStartRef.current.panY + dy);
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch: pinch-to-zoom + drag-to-pan (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start — track initial distance and zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy),
        startZoom: zoomLevel,
      };
      setIsDragging(false);
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // Single finger drag start (only when zoomed in)
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchRef.current.startDist > 0) {
        const ratio = dist / pinchRef.current.startDist;
        const newZoom = Math.max(1, Math.min(pinchRef.current.startZoom * ratio, 6));
        setZoomLevel(newZoom);
        if (newZoom === 1) {
          setPanX(0);
          setPanY(0);
        }
      }
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      // Single finger pan
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPanX(dragStartRef.current.panX + dx);
      setPanY(dragStartRef.current.panY + dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  // HSC Science AI Helper States
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Chat States
  const [activeTab, setActiveTab] = useState<'guide' | 'chat'>('guide');
  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'student' | 'ai'; text: string }>>([]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [aiLanguage, setAiLanguage] = useState<'en' | 'bn_book'>(() => {
    if (typeof window === 'undefined') return 'en';
    return (safeLocalStorage.getItem('ai_language') as 'en' | 'bn_book') || 'en';
  });

  const handleLanguageChange = (lang: 'en' | 'bn_book') => {
    setAiLanguage(lang);
    safeLocalStorage.setItem('ai_language', lang);
  };



  // Automatic scroll container reference
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;

    // Pin scroll position directly to bottom to prevent outer iframe scroll jitter
    container.scrollTop = container.scrollHeight;

    // Use ResizeObserver to auto-scroll when math blocks/LaTex images render asynchronously
    const resizeObserver = new ResizeObserver(() => {
      container.scrollTop = container.scrollHeight;
    });

    resizeObserver.observe(container);

    // Fallback timer to double-check layout adjustments
    const timer = setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 150);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [chatLogs, isAnswering]);

  // Reset state when swiping notebook sheets
  const handleIndexChange = (newIdx: number) => {
    setIndex(newIdx);
    resetZoom();
    setAnalysisResult(null);
    setChatLogs([]);
    setErrorMessage(null);
    setActiveTab('guide');
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newIdx = index > 0 ? index - 1 : images.length - 1;
    handleIndexChange(newIdx);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newIdx = index < images.length - 1 ? index + 1 : 0;
    handleIndexChange(newIdx);
  };

  const currentImage = images[index];

  // Call backend parser
  const handleAnalyzePage = async () => {
    if (!currentImage?.url) return;

    // ── BYOK gate — block AI features until the user connects a Gemini API key ──
    if (!geminiApiKey || !geminiApiKey.trim()) {
      setIsKeyModalOpen(true);
      setErrorMessage(
        language === 'bn'
          ? 'এই ফিচারটি ব্যবহার করতে Gemini API কী সংযুক্ত করুন। আপনার নিজস্ব API কী দিন (BYOK) অথবা https://aistudio.google.com/app/apikey থেকে বিনামূল্যে একটি তৈরি করুন।'
          : 'Connect your Gemini API key to use this feature. Bring Your Own Key (BYOK) — get a free one at https://aistudio.google.com/app/apikey'
      );
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);

      const res = await apiFetch('/api/scan/analyze-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentImage.url, language: aiLanguage })
      });

      if (!res.ok) {
        let serverMsg = '';
        try { const e = await res.json(); serverMsg = e.error || ''; } catch (_) {}
        throw new Error(serverMsg || "Unable to read image scan. Check your internet connection.");
      }

      const data = await res.json();
      setAnalysisResult(data.analysis);

      setChatLogs([
        {
          sender: 'ai',
          text: aiLanguage === 'bn_book'
            ? `👋 আসসালামু আলাইকুম! আমি আপনার ব্যবহারিক নোটবুকের পৃষ্ঠাটি স্ক্যান করেছি। আমি এই অংশটির মূল তাত্ত্বিক ধারণা, সমীকরণ এবং রিডিং বুঝতে সাহায্য করতে প্রস্তুত। আপনি কি নিয়ে আলোচনা করতে চান?`
            : `👋 Salam! I have scanned this practical notebook sheet. I am ready to explain the underlying theories, balance equations, or help you understand this table. What would you like to discuss?`
        }
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to establish connection with AI processing node.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit student chat questions
  const handleAskQuestion = async (presetText?: string) => {
    const textToSend = (presetText || customQuestion).trim();
    if (!textToSend || !currentImage?.url) return;

    // ── BYOK gate ──
    if (!geminiApiKey || !geminiApiKey.trim()) {
      setIsKeyModalOpen(true);
      setErrorMessage(
        language === 'bn'
          ? 'এই ফিচারটি ব্যবহার করতে Gemini API কী সংযুক্ত করুন। আপনার নিজস্ব API কী দিন (BYOK) অথবা https://aistudio.google.com/app/apikey থেকে বিনামূল্যে একটি তৈরি করুন।'
          : 'Connect your Gemini API key to use this feature. Bring Your Own Key (BYOK) — get a free one at https://aistudio.google.com/app/apikey'
      );
      return;
    }

    setChatLogs((prev) => [...prev, { sender: 'student', text: textToSend }]);
    if (!presetText) setCustomQuestion('');

    try {
      setIsAnswering(true);
      setErrorMessage(null);

      const res = await apiFetch('/api/scan/analyze-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: currentImage.url,
          question: textToSend,
          language: aiLanguage
        })
      });

      if (!res.ok) {
        throw new Error("Datalink failed to gather academic assessment.");
      }

      const data = await res.json();
      setChatLogs((prev) => [...prev, { sender: 'ai', text: data.analysis }]);
    } catch (err: any) {
      setChatLogs((prev) => [...prev, { sender: 'ai', text: `⚠️ System Error: ${err.message || "Could not retrieve prompt reply."}` }]);
    } finally {
      setIsAnswering(false);
    }
  };

  // Custom Markdown parser for rich formatted HSC typography
  const renderHscMarkdownList = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return (
      <div className="space-y-3.5 font-sans text-xs sm:text-[13px] leading-relaxed text-slate-300">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Headers formatting
          if (trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-black text-white mt-5 mb-2.5 pb-1 border-b border-white/5 flex items-center gap-2 break-words">
                <span className="w-1 h-3.5 bg-gradient-to-b from-cyan-400 to-indigo-500 rounded-full shrink-0" />
                {trimmed.substring(2)}
              </h3>
            );
          }
          if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            const titleText = trimmed.startsWith('## ') ? trimmed.substring(3) : trimmed.substring(4);
            return (
              <h4 key={idx} className="text-xs sm:text-[12px] font-bold text-cyan-400 mt-4 mb-2 tracking-wide uppercase font-mono flex items-center gap-1.5 break-words">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse shrink-0" />
                {titleText}
              </h4>
            );
          }

          let content = trimmed;
          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
          if (isBullet) {
            content = trimmed.substring(2);
          }

          // Simple code block display helper (formulas, fractions, etc.)
          const isFormula = content.includes('$$') || content.includes('\\frac') || content.includes('\\pi');

          // Bold parsing (**bold**)
          const parts = content.split('**');
          const renderedLine = parts.map((part, pIdx) => {
            if (pIdx % 2 === 1) {
              return <strong key={pIdx} className="text-amber-300 font-extrabold">{part}</strong>;
            }
            return <React.Fragment key={pIdx}>{part}</React.Fragment>;
          });

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 ml-1 mt-1 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0 animate-pulse" />
                <div className="flex-1 text-slate-300 font-medium break-words">{renderedLine}</div>
              </div>
            );
          }

          if (isFormula) {
            return (
              <div key={idx} className="my-2.5 p-3 rounded-xl bg-slate-950/80 border border-cyan-900/30 text-center font-mono text-cyan-300 select-all overflow-x-auto text-[11px] leading-relaxed shadow-inner break-words">
                {content.replace(/\$\$/g, '').trim()}
              </div>
            );
          }

          return <p key={idx} className="text-slate-350 font-normal leading-relaxed break-words">{renderedLine}</p>;
        })}
      </div>
    );
  };


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-[#030712]/98 backdrop-blur-xl select-none overflow-y-auto lg:overflow-hidden text-slate-100"
      >

        {/* ========================================================
            LEFT PORTION: RESPONSIVE CAROUSEL & IMAGE VIEWER
            ======================================================== */}
        <div className="flex-1 flex flex-col justify-between p-3 sm:p-5 h-[48vh] sm:h-[50vh] lg:h-full relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r border-white/5 bg-[#090d16]/30 min-h-0">

          {/* Top Panel Header Actions */}
          <div className="flex items-center justify-between w-full text-white/90 p-1.5 z-10 select-none shrink-0 gap-2">
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[8px] font-mono tracking-widest text-cyan-400 font-black uppercase flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">HSC NOTEBOOK SCANNER</span>
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-150 truncate max-w-[140px] sm:max-w-md mt-0.5" title={currentImage?.title}>
                {currentImage?.title || `Notebook Page ${index + 1}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* HSC AI Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAiAssistant(!showAiAssistant);
                }}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 min-h-[44px] rounded-xl text-[10px] font-black font-mono uppercase tracking-wide border-2 transition-all cursor-pointer ${
                  showAiAssistant
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                    : 'bg-white/5 border-white/10 hover:border-white/30 text-slate-300 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">AI Teacher</span>
                <span className="sm:hidden">AI</span>
              </button>

              <span className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9.5px] font-mono font-bold text-slate-400 shrink-0">
                {index + 1} / {images.length}
              </span>

              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:border-transparent text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Exit viewer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image viewport (extremely fit, non-distorting on any phone) */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 w-full select-none py-2 shrink-0">
            {images.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-1 sm:left-3 z-10 p-2 sm:p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900/40 border border-white/5 hover:bg-white/10 text-white transition-all cursor-pointer active:scale-90"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full flex items-center justify-center p-2 relative min-h-0 overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <motion.img
                key={index}
                initial={{ opacity: 0 }}
                animate={{
                  scale: zoomLevel,
                  x: panX,
                  y: panY,
                  opacity: 1,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 220 }}
                src={currentImage?.url || '/favicon.ico'}
                alt={currentImage?.title || 'Image'}
                onError={(e) => { e.currentTarget.src = '/favicon.ico'; }}
                onClick={(e) => {
                  if (!isDragging) {
                    e.stopPropagation();
                    handleImageClick();
                  }
                }}
                onMouseDown={handleMouseDown}
                draggable={false}
                className="max-w-[95vw] max-h-[34vh] sm:max-h-[38vh] lg:max-h-[72vh] object-contain rounded-2xl border border-white/10 select-none pointer-events-auto touch-none"
              />
            </div>

            {images.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-1 sm:right-3 z-10 p-2 sm:p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900/40 border border-white/5 hover:bg-white/10 text-white transition-all cursor-pointer active:scale-90"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          <div className="w-full max-w-2xl mx-auto flex items-center justify-center gap-1.5 overflow-x-auto py-1 z-10 select-none shrink-0 pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleIndexChange(idx);
                }}
                className={`relative h-8 w-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  idx === index ? 'border-cyan-400 scale-105 shadow-md shadow-cyan-500/20' : 'border-transparent opacity-40 hover:opacity-85'
                }`}
              >
                <img src={img.url} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>


        {/* ========================================================
            RIGHT PORTION: MODERN, ROBUST HSC SCIENCE AI ASSISTANT
            ======================================================== */}
        <AnimatePresence>
          {showAiAssistant ? (
            <motion.div
              initial={{ opacity: 0, x: typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : 360, y: typeof window !== 'undefined' && window.innerWidth < 1024 ? 120 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : 360, y: typeof window !== 'undefined' && window.innerWidth < 1024 ? 120 : 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 200 }}
              className="w-full lg:w-[480px] xl:w-[520px] bg-[#070b13] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col shrink-0 text-left h-[52vh] lg:h-full relative overflow-hidden z-20 select-text min-h-0"
              onClick={(e) => e.stopPropagation()}
            >

              {/* Dynamic Header */}
              <div className="p-3 sm:p-4 bg-[#0a101b] border-b border-white/5 flex items-center justify-between shrink-0 select-none gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 rounded-xl bg-cyan-500/30 blur animate-pulse" />
                    <div className="relative p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/35 text-cyan-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">Bangladesh HSC Practical Guide</h4>
                    <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block mt-0.5 truncate">MULTIMODAL LESSON GENERATOR</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 border border-white/10 p-0.5 rounded-lg select-none shrink-0">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`px-2 py-1 min-h-[28px] rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${aiLanguage === 'en' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleLanguageChange('bn_book')}
                    className={`px-2 py-1 min-h-[28px] rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${aiLanguage === 'bn_book' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    বাংলা
                  </button>
                </div>
              </div>

              {/* Gemini API Key indicator if key provided */}
              {user && (
                <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300 font-sans shrink-0 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {aiLanguage === 'bn_book'
                        ? 'গুগল জেমিনি এআই ল্যাব কো-পাইলট অ্যাক্টিভ'
                        : 'Google Gemini AI Lab Co-Pilot Active'}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/20 border-b border-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-2 select-text shrink-0 break-words">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="break-words">{errorMessage}</span>
                </div>
              )}

              {/* SCENARIO A: BEFORE ANALYSIS STARTS */}
              {!analysisResult && !isAnalyzing && (
                <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center items-center text-center space-y-4 sm:space-y-6 overflow-y-auto min-h-0">
                  <div className="relative my-2 shrink-0">
                    <div className="absolute -inset-2 rounded-full bg-indigo-500/20 blur animate-pulse" />
                    <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Cpu className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="space-y-2.5 max-w-sm w-full min-w-0">
                    <h5 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider font-mono text-cyan-400 break-words">Scan handwritten script</h5>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans break-words">
                      Our Gemini multimodal model reads observed data values, curves, curves slope error formulas, titration tables, or speciment outlines directly off student lab note pages.
                    </p>
                  </div>

                  {/* Curriculums benefits indicators */}
                  <div className="w-full bg-[#0a101b] border border-white/5 p-3 sm:p-4 rounded-xl text-left space-y-3 min-w-0">
                    <span className="text-[9.5px] font-mono text-indigo-400 font-black tracking-widest uppercase block border-b border-white/5 pb-1">PREPARED BOARD REVIEWS INCLUDED:</span>
                    <div className="space-y-2 text-[11.5px] text-slate-350">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="break-words">Core chemicals & equipment theoretical base</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="break-words">Step-by-step practical implementation & errors prevention</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="break-words">Deductions of values & curves interpretations</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="break-words">3 crucial board practical review questions</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyzePage}
                    className="w-full py-4 min-h-[44px] bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 hover:from-cyan-300 hover:to-indigo-500 text-slate-950 font-black rounded-xl text-xs sm:text-[12px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transform active:scale-[0.99] transition-all cursor-pointer shrink-0 uppercase"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
                    <span className="truncate">⚡ SCAN & EXPLAIN PRACTICAL PAGE</span>
                  </button>
                </div>
              )}

              {/* SCENARIO B: IS LOADING */}
              {isAnalyzing && (
                <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-5 min-h-0">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 border-4 border-slate-900 border-t-cyan-400 rounded-full animate-spin" />
                    <Cpu className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs font-black text-slate-105 uppercase tracking-widest font-mono text-cyan-400 break-words">Reading handwritten notebook page...</p>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider max-w-xs break-words">GENERATE CUSTOM CHEMISTRY TITRATIONS OR PHYSICS ERROR SLOPES TUTORIALS</p>
                  </div>
                </div>
              )}

              {/* SCENARIO C: RESULT PANEL */}
              {analysisResult && (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">

                  {/* Selector Tabs (Highly modern pill selector) */}
                  <div className="flex border-b border-white/5 bg-[#0a101b] p-3 gap-2.5 select-none shrink-0">
                    <button
                      onClick={() => setActiveTab('guide')}
                      className={`flex-1 py-2 sm:py-2.5 min-h-[44px] px-2 rounded-xl text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'guide' ? 'bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-indigo-500/15 border-2 border-cyan-400/40 text-cyan-300' : 'text-slate-400 hover:text-slate-200 border border-transparent bg-slate-950/20'}`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">📔 Syllabus Blueprint</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`flex-1 py-2 sm:py-2.5 min-h-[44px] px-2 rounded-xl text-[11px] sm:text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-indigo-500/15 border-2 border-cyan-400/40 text-cyan-300' : 'text-slate-400 hover:text-slate-200 border border-transparent bg-slate-950/20'}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">💬 Q&A Chat Expert</span>
                    </button>
                  </div>

                  {/* ACTIVE TAB ELEMENT VIEWPORTS */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scroll-smooth min-h-0 min-w-0">

                    {/* TAB C1: SYLLABUS LESSON BLUEPRINT */}
                    {activeTab === 'guide' && (
                      <div className="space-y-2 data-guide-animation select-text pb-6 min-w-0">

                        {/* Notice */}
                        <div className="p-3 bg-cyan-900/15 border border-cyan-500/20 rounded-xl mb-4 text-[11px] text-slate-300 flex items-start gap-2.5 leading-relaxed font-sans shadow-sm break-words">
                          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 break-words">
                            <span className="font-extrabold text-cyan-400 block mb-0.5">Multimodal analysis verified</span>
                            Our AI compiled a custom syllabus guide targeting your handwritten lines. If any fuzzy hand-written readings are unclear, click <strong>Q&A Chat</strong>.
                          </div>
                        </div>

                        {analysisResult && <FormattedMarkdown content={analysisResult} />}

                        <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500 font-mono tracking-wider gap-2">
                          <span className="truncate">NATIONAL CURRICULUM SYLLABUS COMPLIANCE</span>
                          <span className="shrink-0">HSC BOT v3.0</span>
                        </div>
                      </div>
                    )}

                    {/* TAB C2: REFINED STUDY MENTOR CHAT DIALOGUE */}
                    {activeTab === 'chat' && (
                      <div className="space-y-4 animate-in fade-in duration-200 h-full flex flex-col justify-between min-h-0 min-w-0">

                        {/* Dialogue scrollbox */}
                        <div ref={chatScrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1 select-text min-h-0 min-w-0">
                          {chatLogs.map((chat, cIdx) => (
                            <div
                              key={cIdx}
                              className={`flex flex-col max-w-[90%] ${chat.sender === 'student' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                            >
                              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1 font-bold">
                                {chat.sender === 'student' ? 'HSC Candidate' : 'AI External Examiner'}
                              </span>
                              <div className={`p-3 rounded-xl text-xs sm:text-[12.5px] leading-relaxed border break-words ${chat.sender === 'student' ? 'bg-gradient-to-r from-[#092540] to-[#041220] border-cyan-500/25 text-cyan-150 rounded-tr-none' : 'bg-slate-900/90 border-[#1c2e4a]/45 text-slate-200 rounded-tl-none font-medium'}`}>
                                {chat.sender === 'ai' ? (
                                  <FormattedMarkdown content={chat.text} />
                                ) : (
                                  <p className="font-semibold font-sans whitespace-pre-wrap break-words">{chat.text}</p>
                                )}
                              </div>
                            </div>
                          ))}

                          {isAnswering && (
                            <div className="flex flex-col mr-auto max-w-[85%] items-start">
                              <span className="text-[8px] font-mono text-cyan-400 animate-pulse font-bold tracking-widest mb-1 uppercase">
                                Analyzing equations & tables...
                              </span>
                              <div className="p-3 rounded-xl bg-[#0a101b] border border-white/5 text-[11px] text-slate-400 font-medium flex items-center gap-2 break-words">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                                <span className="break-words">Developing response...</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive Preset suggestions row */}
                        <div className="pt-3 border-t border-white/5 space-y-2 text-left shrink-0 min-w-0">
                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black block">PRACTICAL CONCEPTS QUICK TRIGGERS:</span>
                          <div className="flex flex-wrap gap-1 min-w-0">
                            <button
                              disabled={isAnswering}
                              onClick={() => handleAskQuestion("What are the most absolute critical errors and precautions we must write inside our script for this specific experiment?")}
                              className="px-2 py-1 min-h-[36px] rounded bg-[#0a101b] hover:bg-[#121c2e] border border-white/5 text-[10px] font-medium text-slate-300 cursor-pointer text-left max-w-full hover:border-cyan-500/20 active:scale-95 transition-all"
                            >
                              ⚠️ Practical Safeguards & Precautions
                            </button>
                            <button
                              disabled={isAnswering}
                              onClick={() => handleAskQuestion("Could you extract the exact balanced chemical reaction formulas or physical equations shown on this laboratory page?")}
                              className="px-2 py-1 min-h-[36px] rounded bg-[#0a101b] hover:bg-[#121c2e] border border-white/5 text-[10px] font-medium text-slate-300 cursor-pointer text-left max-w-full hover:border-cyan-500/20 active:scale-95 transition-all"
                            >
                              🧪 Extract Chemical/Physical Formulas
                            </button>
                          </div>

                          {/* Dynamic text area send bar */}
                          <div className="relative mt-2 min-w-0">
                            <textarea
                              disabled={isAnswering}
                              value={customQuestion}
                              onChange={(e) => setCustomQuestion(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAskQuestion();
                                }
                              }}
                              placeholder="Ask calculations, endpoint change colors or formulas..."
                              rows={2}
                              className="w-full p-2.5 bg-slate-950 border border-white/10 text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-cyan-400/80 text-xs resize-none pr-10 shadow-inner"
                            />
                            <button
                              disabled={isAnswering || !customQuestion.trim()}
                              onClick={() => handleAskQuestion()}
                              className="absolute right-2.5 bottom-2.5 p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 rounded-lg disabled:opacity-20 active:scale-95 transition-all cursor-pointer"
                              title="Submit question to expert"
                            >
                              <Send className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

            </motion.div>
          ) : (
            // Small responsive pull button when AI teacher assistant is hidden on mobile
            <div className="absolute right-3 bottom-14 lg:bottom-8 z-30 select-none">
              <button
                onClick={() => setShowAiAssistant(true)}
                className="flex items-center gap-1.5 px-2.5 py-2 min-h-[36px] min-w-[36px] rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 border border-white/20 text-slate-950 font-sans text-[9px] font-black tracking-wide uppercase shadow-[0_6px_15px_rgba(6,182,212,0.35)] animate-bounce cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-slate-950 animate-pulse shrink-0" />
                <span className="truncate hidden sm:inline">AI Guide</span>
              </button>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  );
};
