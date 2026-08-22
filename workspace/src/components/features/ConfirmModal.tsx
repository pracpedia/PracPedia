'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
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
              className="px-4 py-2 min-h-[44px] text-slate-400 hover:text-white hover:bg-white/5 font-semibold transition-all rounded-xl text-xs cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
