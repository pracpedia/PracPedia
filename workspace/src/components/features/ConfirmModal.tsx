'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Confirmation handler. May be sync or async — the modal waits for it
   *  to resolve before closing, so async operations (delete, fetch, etc.)
   *  complete before the modal disappears. If it throws, the modal stays
   *  open so the parent can surface the error. */
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
}) => {
  const [isConfirming, setIsConfirming] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Await the onConfirm callback so async operations (delete, fetch, etc.)
    // complete before the modal closes. If it throws, keep the modal open
    // so the parent can surface the error.
    try {
      setIsConfirming(true);
      await onConfirm();
      onClose();
    } catch {
      // Parent's onConfirm is responsible for its own error UI.
      // We keep the modal open on error so the user can retry.
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isConfirming ? undefined : onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Layer */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-sm max-w-[92vw] bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10"
        >
          {/* Header & Icon */}
          <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-3.5 border-b border-white/[0.04]">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              isDestructive
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/15'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-white leading-snug">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                {message}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-3 sm:p-4 bg-white/[0.01] flex items-center justify-end gap-2 sm:gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="px-4 py-2 min-h-[44px] text-slate-400 hover:text-white hover:bg-white/5 font-semibold transition-all rounded-xl text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isConfirming ? '…' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
