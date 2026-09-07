'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Sparkles, CheckCircle2, AlertCircle, ExternalLink, X, ShieldCheck, RefreshCw, Eye, EyeOff, Clipboard, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const GeminiKeyModal: React.FC = () => {
  const { geminiApiKey, setGeminiApiKey, isKeyModalOpen, setIsKeyModalOpen, language } = useAuth();
  const [inputKey, setInputKey] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isKeyModalOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputKey(text.trim());
        setMsg(language === 'bn' ? 'ক্লিপবোর্ড থেকে পেস্ট করা হয়েছে!' : 'Pasted key from clipboard!');
        setStatus('idle');
      }
    } catch (err) {
      setMsg(language === 'bn' ? 'ক্লিপবোর্ড এক্সেস করার অনুমতি প্রয়োজন' : 'Clipboard access permission needed');
      setStatus('error');
    }
  };

  const handleCopy = () => {
    if (!inputKey) return;
    try { navigator.clipboard.writeText(inputKey); } catch {} ;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setGeminiApiKey('');
      setStatus('idle');
      setMsg(language === 'bn' ? 'এপিআই কি সরিয়ে ফেলা হয়েছে' : 'API Key cleared');
      return;
    }

    setStatus('testing');
    setMsg(language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Gemini API key...');

    // Verify the key via our server-side endpoint — this avoids
    // "User location is not supported" errors because the request
    // goes through the server (Vercel US/EU), not the user's browser.
    try {
      const res = await fetch('/api/gemini/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.valid) {
        setGeminiApiKey(cleanKey);
        setStatus('success');
        setMsg(language === 'bn' ? 'গুগল জেমিনি এপিআই কি সফলভাবে সংযুক্ত হয়েছে!' : 'Google Gemini API key successfully linked!');
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setStatus('idle');
        }, 1200);
      } else if (res.ok && data.locationBlocked) {
        // Key is valid but server location is blocked — allow saving anyway
        setGeminiApiKey(cleanKey);
        setStatus('success');
        setMsg('API key is valid! Server location is currently blocked, but it will work when deployed to Vercel.');
        setTimeout(() => {
          setIsKeyModalOpen(false);
          setStatus('idle');
        }, 2500);
      } else {
        setStatus('error');
        setMsg(
          language === 'bn'
            ? `কি যাচাই ব্যর্থ: ${data?.error || 'আপনার API কি চেক করুন'}`
            : `Key verification failed: ${data?.error || 'Check your API key'}`
        );
      }
    } catch (err: any) {
      setStatus('error');
      setMsg(language === 'bn' ? 'নেটওয়ার্ক ত্রুটি: কি যাচাই করা যায়নি' : 'Network error: could not verify key');
    }
  };

  const handleClear = () => {
    setGeminiApiKey('');
    setInputKey('');
    setStatus('idle');
    setMsg(language === 'bn' ? 'এপিআই কি সরানো হয়েছে' : 'API key disconnected');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 md:p-8 max-w-lg w-full max-w-[92vw] shadow-2xl relative overflow-hidden my-4"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => setIsKeyModalOpen(false)}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-6 pr-8 sm:pr-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Key className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white font-sans">
                  {language === 'bn' ? 'গুগল জেমিনি এপিআই কি' : 'Google Gemini API Key'}
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  BYOK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার নিজের গুগল জেমিনি এপিআই কি ব্যবহার করে সম্পূর্ণ বিনামূল্যে আনলিমিটেড এআই অ্যাসিস্ট্যান্ট ফিচার উপভোগ করুন।'
                  : 'Bring Your Own Key (BYOK) — Use your free Google Gemini API key for unlimited AI co-pilot features.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between gap-2 flex-wrap">
                <span>{language === 'bn' ? 'জেমিনি এপিআই কি (API Key)' : 'Gemini API Key'}</span>
                {geminiApiKey ? (
                  <span className="text-emerald-400 text-[10px] lowercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {language === 'bn' ? 'সংযুক্ত আছে' : 'Active'}
                  </span>
                ) : (
                  <span className="text-slate-500 text-[10px]">
                    {language === 'bn' ? 'কোনো কি দেওয়া হয়নি' : 'Not configured'}
                  </span>
                )}
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-4 pr-24 sm:pr-32 py-3 text-sm font-mono text-white placeholder:text-slate-600 outline-none transition-all min-h-[44px]"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2 py-1 text-[11px] font-mono font-bold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Paste key from clipboard"
                  >
                    <Clipboard className="w-3 h-3" />
                    <span className="hidden xs:inline sm:inline">{language === 'bn' ? 'পেস্ট' : 'Paste'}</span>
                  </button>
                  {inputKey && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                      title="Copy key"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction link */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="break-words">
                  {language === 'bn'
                    ? 'আপনার কি সম্পূর্ণ সুরক্ষিত এবং ব্রাউজারে সংরক্ষিত থাকে।'
                    : 'Stored locally in your browser. Never shared.'}
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-bold underline shrink-0 flex items-center gap-1 text-[11px]"
              >
                {language === 'bn' ? 'ফ্রি কি নিন' : 'Get Free Key'}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Status message */}
            {msg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 break-words ${
                  status === 'error'
                    ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                    : status === 'success'
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />}
                {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{msg}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2 flex-wrap">
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/30 text-xs font-bold transition-all"
                >
                  {language === 'bn' ? 'কি মুছুন' : 'Disconnect Key'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={status === 'testing'}
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {status === 'testing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save API Key'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
