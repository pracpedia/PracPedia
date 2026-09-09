'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, FolderClosed, Save, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from './ConfirmModal';

interface SubjectType {
  id: string;
  _id?: string;
  title: string;
  description: string;
}

interface ImageType {
  url: string;
  title: string;
}

interface FolderType {
  id: string;
  _id?: string;
  subjectId: string;
  title: string;
  description: string;
  images: ImageType[];
  createdAt: string;
}

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectType[];
  initialSubjectId?: string;
  editFolder: FolderType | null;
  onSave: (title: string, description: string, subjectId: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  editFolder,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (editFolder) {
      setTitle(editFolder.title);
      setDescription(editFolder.description);
      setSubjectId(editFolder.subjectId);
    } else {
      setTitle('');
      setDescription('');
      setSubjectId(initialSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
    }
    setError(null);
  }, [editFolder, initialSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !subjectId) {
      setError('Please fully capture the title, description, and related course subject.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(title.trim(), description.trim(), subjectId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the practical notebook.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!editFolder) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(editFolder.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the practical notebook.');
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Sheet Layer */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          className="relative w-full max-w-lg max-w-[92vw] bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-4"
        >
          {/* Header section banner */}
          <div className="p-4 sm:p-6 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 shrink-0">
                <FolderClosed className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {editFolder ? 'Edit Practical Catalog' : 'Catalogue New Notebook'}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-0.5 uppercase truncate">
                  {editFolder ? 'Update module settings' : 'Provision course folder'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form and input items */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2 break-words">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {/* Title field */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-semibold block">
                Experiment / Practical Module Title
              </label>
              <input
                type="text"
                placeholder="e.g. Titration Analysis and Acid-Base Calibration"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 min-h-[44px] bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 rounded-xl outline-none focus:border-indigo-500/50 transition-all font-sans"
              />
            </div>

            {/* Description field */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-semibold block">
                Syllabus Module Description
              </label>
              <textarea
                placeholder="Brief summary outlining curriculum objective, required apparatus, and diagram requirements..."
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 rounded-xl outline-none focus:border-indigo-500/50 transition-all font-sans resize-none"
              />
            </div>

            {/* Course Subject select dropdown list */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-semibold block">
                Related Course Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                className="w-full px-4 py-2.5 min-h-[44px] bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white rounded-xl outline-none focus:border-indigo-500/50 transition-all font-sans cursor-pointer"
              >
                <option value="" disabled>Select related course subject...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons tray */}
            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
              {editFolder ? (
                <button
                  type="button"
                  disabled={isSaving || isDeleting}
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-4 py-2 min-h-[44px] bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all rounded-xl text-xs font-bold leading-none flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="truncate">{isDeleting ? 'Deleting...' : 'Delete Catalog'}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] text-slate-400 hover:text-white hover:bg-white/5 font-bold transition-all rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span className="truncate">{isSaving ? 'Processing...' : editFolder ? 'Save Changes' : 'Create Folder'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>

        <ConfirmModal
          isOpen={showConfirmDelete}
          onClose={() => setShowConfirmDelete(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Practical Notebook?"
          message="Are you absolutely sure you want to retract and delete this module? This action removes all connected sheet page scans."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          isDestructive={true}
        />
      </div>
    </AnimatePresence>
  );
};
