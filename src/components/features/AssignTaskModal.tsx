'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Users, Pen, PenLine, CheckCircle2, AlertCircle,
  UserPlus, Trash2, TrendingUp,
} from 'lucide-react';

interface AssignTaskModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingSubject: string;
  bookingPrice: number;
  bookingServiceType: string; // 'drawing_only' | 'drawing_writing'
}

interface Assistant {
  id: string;
  name: string;
  email: string;
  profilePic: string | null;
}

interface ExistingSubtask {
  id: string;
  taskType: string;
  splitPercent: number;
  earnings: number;
  status: string;
  assistant: { id: string; name: string };
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  open, onClose, bookingId, bookingSubject, bookingPrice, bookingServiceType,
}) => {
  const { apiFetch } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [existingSubtasks, setExistingSubtasks] = useState<ExistingSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for drawing
  const [drawAssistant, setDrawAssistant] = useState('');
  const [drawSplit, setDrawSplit] = useState(40);

  // Form state for writing
  const [writeAssistant, setWriteAssistant] = useState('');
  const [writeSplit, setWriteSplit] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asstRes, subRes] = await Promise.all([
        apiFetch('/api/assistants'),
        apiFetch(`/api/subtasks?bookingId=${bookingId}`),
      ]);

      if (asstRes.ok) {
        const asstData = await asstRes.json();
        setAssistants(asstData.assistants || []);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        const subs = subData.subtasks || [];
        setExistingSubtasks(subs);
        // Pre-fill form with existing assignments
        const drawSub = subs.find((s: any) => s.taskType === 'drawing');
        if (drawSub) {
          setDrawAssistant(drawSub.assistant.id);
          setDrawSplit(drawSub.splitPercent);
        }
        const writeSub = subs.find((s: any) => s.taskType === 'writing');
        if (writeSub) {
          setWriteAssistant(writeSub.assistant.id);
          setWriteSplit(writeSub.splitPercent);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, bookingId]);

  useEffect(() => {
    if (open && bookingId) {
      fetchData();
    }
  }, [open, bookingId, fetchData]);

  const drawEarnings = Math.round((bookingPrice * drawSplit) / 100);
  const writeEarnings = Math.round((bookingPrice * writeSplit) / 100);
  const totalAllocated = drawSplit + writeSplit;
  const artistShare = Math.max(0, 100 - totalAllocated);
  const artistEarnings = Math.round((bookingPrice * artistShare) / 100);

  const canAssignDrawing = bookingServiceType === 'drawing_only' || bookingServiceType === 'drawing_writing';
  const canAssignWriting = bookingServiceType === 'drawing_writing';

  const handleAssign = async (taskType: 'drawing' | 'writing') => {
    const assistantId = taskType === 'drawing' ? drawAssistant : writeAssistant;
    const split = taskType === 'drawing' ? drawSplit : writeSplit;

    if (!assistantId) {
      setError(`Please select an assistant for the ${taskType} part.`);
      return;
    }
    if (split < 1 || split > 100) {
      setError(`Split must be between 1% and 100%.`);
      return;
    }

    // Check total doesn't exceed 100%
    const otherSplit = taskType === 'drawing' ? writeSplit : drawSplit;
    const hasOtherSubtask = existingSubtasks.some(s => s.taskType === (taskType === 'drawing' ? 'writing' : 'drawing') && s.status !== 'declined');
    const calculatedTotal = split + (hasOtherSubtask ? otherSplit : 0);
    if (calculatedTotal > 100) {
      setError(`Total split exceeds 100%. Current: ${calculatedTotal}%. Max allowed: ${100 - (hasOtherSubtask ? otherSplit : 0)}%.`);
      return;
    }

    setAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/api/bookings/${bookingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType,
          assistantId,
          splitPercent: split,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to assign ${taskType} task`);
      }

      setSuccess(`${taskType === 'drawing' ? 'Drawing' : 'Writing'} part assigned successfully!`);
      // Refresh subtasks
      await fetchData();
    } catch (e: any) {
      setError(e?.message || `Could not assign ${taskType} task`);
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, taskType: string) => {
    setAssigning(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove assignment');
      }
      setSuccess(`${taskType === 'drawing' ? 'Drawing' : 'Writing'} assignment removed.`);
      // Reset form for that task type
      if (taskType === 'drawing') { setDrawAssistant(''); setDrawSplit(40); }
      if (taskType === 'writing') { setWriteAssistant(''); setWriteSplit(30); }
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Could not remove assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setDrawAssistant('');
    setWriteAssistant('');
    setDrawSplit(40);
    setWriteSplit(30);
    onClose();
  };

  const formatBDT = (amount: number) => `৳${Number(amount || 0).toLocaleString('en-US')}`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md"
          style={{ height: '100dvh' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto bg-[#0d121f] border border-slate-700/70 rounded-t-3xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }}
          >
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate">Assign to Assistant</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 truncate">{bookingSubject}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="ml-2 text-xs text-slate-400">Loading team...</span>
                </div>
              ) : assistants.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-400">You don't have any assistants yet.</p>
                  <p className="text-[10px] text-slate-500">Go to the "Assistants" tab to invite team members first.</p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  {/* Order Info */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Total Price</p>
                      <p className="text-base sm:text-lg font-black text-white truncate">{formatBDT(bookingPrice)}</p>
                    </div>
                    <div className="text-right min-w-0">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold">Your Share</p>
                      <p className="text-base sm:text-lg font-black text-emerald-400 truncate">{artistShare}% = {formatBDT(artistEarnings)}</p>
                    </div>
                  </div>

                  {/* Drawing Part */}
                  {canAssignDrawing && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <Pen className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Drawing Part</span>
                      </div>

                      {existingSubtasks.filter(s => s.taskType === 'drawing' && s.status !== 'declined').length > 0 ? (
                        <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 space-y-2">
                          {existingSubtasks.filter(s => s.taskType === 'drawing' && s.status !== 'declined').map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{sub.assistant.name}</p>
                                <p className="text-[10px] text-slate-400">{sub.splitPercent}% = {formatBDT(sub.earnings)} · <span className={sub.status === 'completed' ? 'text-emerald-400' : sub.status === 'in_progress' ? 'text-cyan-400' : 'text-amber-400'}>{sub.status}</span></p>
                              </div>
                              {sub.status === 'assigned' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubtask(sub.id, 'drawing')}
                                  disabled={assigning}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[32px] px-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Assign To</label>
                            <select
                              value={drawAssistant}
                              onChange={(e) => setDrawAssistant(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white outline-none min-h-[44px]"
                            >
                              <option value="">Select assistant...</option>
                              {assistants.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-bold text-slate-400">Split %</label>
                              <span className="text-[10px] font-mono text-amber-300 font-bold">{drawSplit}% = {formatBDT(drawEarnings)}</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              step={5}
                              value={drawSplit}
                              onChange={(e) => setDrawSplit(Number(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer min-h-[44px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssign('drawing')}
                            disabled={assigning || !drawAssistant}
                            className="w-full py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                            Assign Drawing
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Writing Part */}
                  {canAssignWriting && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        <PenLine className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Writing Part</span>
                      </div>

                      {existingSubtasks.filter(s => s.taskType === 'writing' && s.status !== 'declined').length > 0 ? (
                        <div className="p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/15 space-y-2">
                          {existingSubtasks.filter(s => s.taskType === 'writing' && s.status !== 'declined').map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{sub.assistant.name}</p>
                                <p className="text-[10px] text-slate-400">{sub.splitPercent}% = {formatBDT(sub.earnings)} · <span className={sub.status === 'completed' ? 'text-emerald-400' : sub.status === 'in_progress' ? 'text-cyan-400' : 'text-amber-400'}>{sub.status}</span></p>
                              </div>
                              {sub.status === 'assigned' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubtask(sub.id, 'writing')}
                                  disabled={assigning}
                                  className="text-[10px] text-rose-400 hover:text-rose-300 font-bold disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer shrink-0 min-h-[32px] px-2"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-1">Assign To</label>
                            <select
                              value={writeAssistant}
                              onChange={(e) => setWriteAssistant(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none min-h-[44px]"
                            >
                              <option value="">Select assistant...</option>
                              {assistants.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-bold text-slate-400">Split %</label>
                              <span className="text-[10px] font-mono text-cyan-300 font-bold">{writeSplit}% = {formatBDT(writeEarnings)}</span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              step={5}
                              value={writeSplit}
                              onChange={(e) => setWriteSplit(Number(e.target.value))}
                              className="w-full accent-cyan-500 cursor-pointer min-h-[44px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAssign('writing')}
                            disabled={assigning || !writeAssistant}
                            className="w-full py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold hover:bg-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                          >
                            {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                            Assign Writing
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-[10px] font-mono gap-3">
                    <span className="text-slate-500">Allocated: <span className={totalAllocated > 100 ? 'text-rose-400 font-bold' : 'text-slate-300 font-bold'}>{totalAllocated}%</span></span>
                    <span className="text-slate-500">Your share: <span className="text-emerald-400 font-bold">{artistShare}%</span></span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
