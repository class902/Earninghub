import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { searchLeadsByUpi, SearchLeadsByUpiOutputType } from '@/lib/api';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';
import StatusGlowBox from '@/components/StatusGlowBox';
import type { Offer, StatusCTAConfig } from '@/types';
import { DEFAULT_STATUS_CTA_CONFIG } from '@/types';

type DateFilter = '24h' | '7d' | '30d' | 'custom';
type TrackResult = SearchLeadsByUpiOutputType['leads'][0];

interface Props {
  prefilledUpi?: string;
  offerNameFilter?: string;
  offers?: Offer[];
  telegramLink?: string;
  supportEmail?: string;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────
function getStatusColor(s: string) {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
  if (l === 'approved') return { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  if (l === 'rejected' || l === 'missing') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  if (l === 'missing') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
  return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
}

function getStatusDotColor(s: string): string {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return '#4ade80';
  if (l === 'approved') return '#94a3b8';
  if (l === 'rejected') return '#f87171';
  if (l === 'missing') return '#f87171';
  if (l === 'hold' || l === 'on hold') return '#fb923c';
  return '#fbbf24';
}

function getStatusEmoji(s: string): string {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return '✅';
  if (l === 'approved') return '⏳';
  if (l === 'rejected' || l === 'missing') return '❌';
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return '⏸️';
  return '🔄';
}

function getStatusEmojiAnimation(s: string): string {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return 'status-emoji-bounce';
  if (l === 'approved') return 'status-emoji-pulse';
  if (l === 'rejected' || l === 'missing') return 'status-emoji-shake';
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return 'status-emoji-pulse';
  return 'status-emoji-spin';
}

function getFieldIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('name')) return '👤';
  if (l.includes('upi') || l.includes('payment') || l.includes('wallet')) return '💳';
  if (l.includes('mobile') || l.includes('phone')) return '📱';
  if (l.includes('email')) return '✉️';
  if (l.includes('date') || l.includes('time')) return '📅';
  return '📋';
}

function formatDate(d: string) {
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return d; }
}
function formatDateTime(d: string) {
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const h = dt.getHours();
    const min = String(dt.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${dd}/${mm}/${yyyy}, ${h12}:${min} ${ampm}`;
  } catch { return d; }
}

function getStatusBadgeStyle(s: string): { border: string; text: string; bg: string } {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return { border: 'rgba(34,197,94,0.5)', text: '#4ade80', bg: 'rgba(34,197,94,0.1)' };
  if (l === 'approved') return { border: 'rgba(148,163,184,0.4)', text: '#94a3b8', bg: 'rgba(148,163,184,0.08)' };
  if (l === 'rejected' || l === 'missing') return { border: 'rgba(220,38,38,0.5)', text: '#f87171', bg: 'rgba(220,38,38,0.1)' };
  if (l === 'missing') return { border: 'rgba(239,68,68,0.5)', text: '#f87171', bg: 'rgba(239,68,68,0.08)' };
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return { border: 'rgba(249,115,22,0.4)', text: '#fb923c', bg: 'rgba(249,115,22,0.08)' };
  return { border: 'rgba(245,158,11,0.3)', text: '#fbbf24', bg: 'rgba(245,158,11,0.06)' };
}

function getTimelineDone(s: string): number {
  const l = s.toLowerCase();
  if (l === 'paid' || l === 'cashback sent') return 5;
  if (l === 'approved') return 3;
  if (l === 'rejected' || l === 'missing') return 2;
  if (l === 'hold' || l === 'on hold' || l === 'duplicate') return 2;
  return 1;
}

// ─── Status Timeline ──────────────────────────────────────────────────────────
function StatusTimeline({ status, createdAt }: { status: string; createdAt?: string }) {
  const STEPS = [{ label: 'SUBMITTED', emoji: '🔄' }, { label: 'PROCESSING', emoji: '⏸️' }, { label: 'APPROVED', emoji: '⏳' }, { label: 'PAYMENT', emoji: '✅' }, { label: 'PAID ✓', emoji: '✅' }];
  const done = getTimelineDone(status);
  const l = status.toLowerCase();
  const rejected = l === 'rejected';
  const onHold = l === 'hold' || l === 'on hold';
  const missing = l === 'missing' || rejected;
  const duplicate = l === 'duplicate';
  const isBlocked = onHold || missing || duplicate;
  const progressPct = Math.max(0, ((done - 1) / 4) * 80);
  const progressColor = missing ? 'linear-gradient(90deg, hsl(var(--primary)), #ef4444)' :
    onHold || duplicate ? 'linear-gradient(90deg, hsl(var(--primary)), #f97316)' :
    'linear-gradient(90deg, hsl(var(--primary)), #8b5cf6)';

  // Get the correct status emoji for the current active step
  const currentEmoji = getStatusEmoji(status);

  return (
    <div className="relative pt-2 pb-1">
      <div className="absolute top-[26px] left-[10%] right-[10%] h-[4px] rounded-full bg-border/25" />
      <div className="absolute top-[26px] left-[10%] h-[4px] rounded-full transition-all duration-700"
        style={{ width: `${progressPct}%`, background: progressColor }} />
      <div className="relative flex justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = i < done - 1;
          const isActive = i === done - 1;
          const isMissingStep = missing && isActive;
          const isOnHoldStep = (onHold || duplicate) && isActive;
          const isBlockedStep = isMissingStep || isOnHoldStep;
          return (
            <div key={step.label} className="flex flex-col items-center" style={{ width: '20%' }}>
              <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center z-10 relative transition-all ${isMissingStep ? 'bg-red-500/20 border-red-500' : isOnHoldStep ? 'bg-orange-500/20 border-orange-400' : isActive && !isBlockedStep ? 'bg-amber-500/15 border-amber-400' : isCompleted ? 'bg-primary/20 border-primary' : 'border-border/30 bg-background/50'}`}
                style={{ boxShadow: isMissingStep ? '0 0 16px rgba(239,68,68,0.4)' : isOnHoldStep ? '0 0 16px rgba(249,115,22,0.4)' : isActive && !isBlockedStep ? '0 0 20px rgba(245,158,11,0.45)' : isCompleted ? '0 0 14px rgba(59,130,246,0.3)' : 'none' }}>
                {isMissingStep ? <span className="text-red-400 text-base status-emoji-shake">❌</span> :
                  isOnHoldStep ? <span className="text-orange-400 text-base status-emoji-pulse">⏸️</span> :
                  isActive && !isBlockedStep ? <span className="text-amber-400 text-base status-emoji-spin">{currentEmoji}</span> :
                  isCompleted ? <span className="text-primary font-black text-xs">✓</span> :
                  <span className="text-border/50 font-black text-xs">{i + 1}</span>}
              </div>
              <p className={`text-center mt-1.5 font-black leading-tight ${isMissingStep ? 'text-red-400' : isOnHoldStep ? 'text-orange-400' : isActive && !isBlockedStep ? 'text-amber-400' : isCompleted ? 'text-foreground/70' : 'text-muted-foreground/30'}`} style={{ fontSize: 8.5 }}>
                {isMissingStep ? 'MISSING' : isOnHoldStep ? (duplicate ? 'DUPLICATE' : 'ON HOLD') : step.label}
              </p>
              {i === 0 && createdAt && (
                <p className="text-center text-muted-foreground/40 mt-0.5" style={{ fontSize: 7.5 }}>{formatDate(createdAt)}</p>
              )}
            </div>
          );
        })}
      </div>
      {/* Blocked status banner */}
      {isBlocked && (
        <div className={`mt-3 px-3 py-2 rounded-xl border text-center ${rejected || missing ? 'bg-red-500/8 border-red-500/25' : 'bg-orange-500/8 border-orange-500/25'}`}>
          <p className={`text-[10px] font-black ${rejected || missing ? 'text-red-400' : 'text-orange-400'}`}>
            {rejected ? '❌ This application was not approved' : missing ? '❓ Lead is marked as missing — contact support' : duplicate ? '⚠️ Duplicate submission detected' : '⏸ Application is on hold'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Status History Log ───────────────────────────────────────────────────────
function StatusHistoryLog({ history }: { history: Array<{ status: string; date: string }> }) {
  if (!history || history.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
      <div className="px-5 pt-4 pb-3 border-b border-border/20">
        <p className="font-syne font-black text-xs uppercase tracking-widest text-foreground/80">📋 Status History</p>
      </div>
      <div className="px-5 py-3 space-y-2">
        {[...history].reverse().map((h, i) => {
          const sc = getStatusBadgeStyle(h.status);
          return (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/10 last:border-0">
              <span className="text-xs font-black px-2.5 py-1 rounded-full border flex-shrink-0"
                style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}>
                {h.status}
              </span>
              <span className="text-[11px] text-muted-foreground font-semibold text-right">{formatDateTime(h.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lead Tab Buttons (replaces scroll navigator) ─────────────────────────────
function LeadTabButtons({ results, activeId, onSelect }: {
  results: TrackResult[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  if (results.length <= 1) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 overflow-hidden bg-card">
      <div className="px-4 pt-3 pb-2.5 border-b border-primary/15 flex items-center gap-2">
        <span className="text-sm status-emoji-pulse flex-shrink-0">🔄</span>
        <p className="font-syne font-black text-xs text-primary uppercase tracking-widest">
          {results.length} Applications Found
        </p>
        <span className="text-[10px] text-muted-foreground ml-auto font-semibold">Tap to switch</span>
      </div>
      <div className="p-3 flex flex-wrap gap-2">
        {results.map((r, i) => {
          const isActive = r.id === activeId;
          const statusEmoji = getStatusEmoji(r.status);
          const emojiAnim = getStatusEmojiAnimation(r.status);
          const dotColor = getStatusDotColor(r.status);
          const nameField = r.fields.find(f => f.label.toLowerCase().includes('name'));
          const displayName = nameField?.maskedValue || r.offerName;
          return (
            <button key={r.id} onClick={() => onSelect(r.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-left ${
                isActive
                  ? 'border-primary bg-primary/15 shadow-lg shadow-primary/10'
                  : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5'
              }`}>
              <span className={`text-[10px] font-black ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {i === 0 ? '🔝' : `#${i + 1}`}
              </span>
              <div className="flex flex-col min-w-0">
                <span className={`font-syne font-black text-[11px] leading-tight max-w-[100px] truncate ${isActive ? 'text-foreground' : 'text-foreground/70'}`}>
                  {displayName}
                </span>
                <span className="text-[9px] font-bold" style={{ color: dotColor }}>{r.status}</span>
              </div>
              <span className={`text-sm flex-shrink-0 ${emojiAnim}`} style={{ filter: `drop-shadow(0 0 4px ${dotColor}80)` }}>{statusEmoji}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Action Buttons ───────────────────────────────────────────────────────────
function getSocialBg(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'linear-gradient(135deg, #0088cc, #006699)';
  if (n.includes('whatsapp')) return 'linear-gradient(135deg, #25d366, #128c7e)';
  if (n.includes('instagram')) return 'linear-gradient(135deg, #f77737, #e1306c, #405de6)';
  if (n.includes('facebook')) return 'linear-gradient(135deg, #1877f2, #0a5dc2)';
  if (n.includes('youtube')) return 'linear-gradient(135deg, #ff0000, #cc0000)';
  if (n.includes('support') || n.includes('help')) return 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
  return 'linear-gradient(135deg, hsl(var(--primary)), #f0b429)';
}
function getSocialIconTrack(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return '✈';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('instagram')) return '📷';
  if (n.includes('youtube')) return '▶';
  if (n.includes('support') || n.includes('help')) return '🎧';
  return '🔗';
}

function ActionButtons({ telegramLink: _tl, supportEmail: _se }: { telegramLink?: string; supportEmail?: string }) {
  const { settings } = useAppContext();
  const socialLinks = settings?.socialLinks || [];

  if (!socialLinks.length) return null;

  return (
    <div className="flex flex-col gap-3 px-1">
      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest text-center">🔗 Social Media</p>
      {socialLinks.map(link => {
        const n = link.name.toLowerCase();
        const cta = n.includes('telegram') ? 'Follow / Join →' : n.includes('whatsapp') ? 'Contact Us →' : (n.includes('help') || n.includes('support')) ? 'Get Help →' : 'Visit →';
        return (
          <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:border-primary/40 transition-all group w-full"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {link.iconUrl ? (
              <img src={link.iconUrl} alt={link.name}
                className="w-11 h-11 rounded-full object-cover group-hover:scale-110 transition-transform flex-shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform text-white"
                style={{ background: getSocialBg(link.name) }}>
                {getSocialIconTrack(link.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-syne font-black text-sm text-foreground">{link.name}</p>
              <p className="text-xs text-muted-foreground">{cta}</p>
            </div>
            <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">→</span>
          </a>
        );
      })}
    </div>
  );
}

// ─── Submitted Details (read-only — search config is admin-only) ───────────────
function SubmittedDetails({ result }: { result: TrackResult }) {
  const dataFields = result.fields.filter(f => !f.isProof);
  const proofFields = result.fields.filter(f => f.isProof);
  const displayDate = result.submissionDate || result.createdAt;
  const showDatesTimestamps = result.actionConfig?.showDatesTimestamps !== false;

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
      <div className="px-5 pt-4 pb-3 border-b border-border/20">
        <p className="font-syne font-black text-xs uppercase tracking-widest text-foreground/80">Submitted Details</p>
      </div>

      {dataFields.map((f, i) => (
        <div key={i} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i < dataFields.length - 1 ? 'border-b border-border/15' : ''}`}>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-sm w-5 text-center opacity-70">{getFieldIcon(f.label)}</span>
            <span className="text-xs text-muted-foreground font-semibold">{f.label}</span>
          </div>
          <span className="text-sm font-bold text-foreground text-right">{f.maskedValue || '—'}</span>
        </div>
      ))}
      {showDatesTimestamps && displayDate && (
        <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${dataFields.length > 0 ? 'border-t border-border/15' : ''}`}>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-sm w-5 text-center opacity-70">📅</span>
            <span className="text-xs text-muted-foreground font-semibold">Date of Submission</span>
          </div>
          <span className="text-sm font-bold text-foreground text-right">{formatDateTime(displayDate)}</span>
        </div>
      )}
      {result.publicRemark && (
        <div className="flex items-start justify-between gap-4 px-5 py-3.5 border-t border-border/15">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-sm w-5 text-center opacity-70">💬</span>
            <span className="text-xs text-muted-foreground font-semibold">Remarks</span>
          </div>
          <span className="text-sm font-bold text-foreground text-right max-w-[55%] leading-relaxed">{result.publicRemark}</span>
        </div>
      )}
      {proofFields.map((f, i) => (
        <div key={`proof-${i}`} className="px-5 py-4 border-t border-border/15 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">📎 {f.label}</p>
          {f.maskedValue.toLowerCase().includes('.pdf') ? (
            <a href={f.maskedValue} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-xl text-primary text-sm font-bold hover:border-primary transition-all">
              📄 View PDF Proof →
            </a>
          ) : (
            <a href={f.maskedValue} target="_blank" rel="noreferrer" className="block">
              <img src={f.maskedValue} alt="Proof" className="w-full max-h-48 object-cover rounded-xl border border-border hover:opacity-90 transition-opacity"
                onError={e => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result, offer, telegramLink, supportEmail, statusCtaConfig, statusLabels, statusHistoryMode, payoutUserLabel, payoutSendLabel }: {
  result: TrackResult;
  offer?: Offer;
  telegramLink?: string;
  supportEmail?: string;
  statusCtaConfig?: StatusCTAConfig;
  statusLabels?: Record<string, string>;
  statusHistoryMode?: 'show' | 'collapsed' | 'hidden';
  payoutUserLabel?: string;
  payoutSendLabel?: string;
}) {
  const statusColor = getStatusColor(result.status);
  const effectiveMode = statusHistoryMode || 'show';
  const [historyVisible, setHistoryVisible] = useState(effectiveMode === 'show');
  const hasHistory = result.statusHistory && result.statusHistory.length > 0;
  // ── Module 2 & 3: Per-lead granular visibility toggles (admin-controlled, default true) ──
  const perLeadShowUserGot = result.actionConfig?.showUserGot !== false;
  const perLeadShowEstimate = result.actionConfig?.showEstimate !== false;
  const perLeadShowStatusHistory = result.actionConfig?.showStatusHistory !== false;
  const showHistorySection = hasHistory && effectiveMode !== 'hidden' && perLeadShowStatusHistory;
  const displayStatus = statusLabels?.[result.status] || result.status;
  const detailEmoji = getStatusEmoji(result.status);

  // ✅ ZERO-LEAKAGE: Only use user-facing amounts from actionConfig
  // NEVER use result.offerPayout (Total Lead) — it is always 0 from the API
  const estimateUser = result.actionConfig?.userPayout || 0;
  const userGot = result.actionConfig?.sendUserAmount || 0;
  const sendUserNote = result.actionConfig?.sendUserNote || '';

  // ── Per-lead toggles are the SOLE control (canShowPayout is no longer a gate) ──
  // The 💡 admin toggle per lead directly controls user-facing visibility.
  // Zero-leakage is maintained: offerPayout (Total Lead) is still always 0 from API.
  const canShowPayout = result.showPayoutToUser; // kept for reference / legacy
  const showUserGotMode = perLeadShowUserGot && userGot > 0;
  const showEstimateRow = perLeadShowEstimate && estimateUser > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: 'easeOut' }}
      className="space-y-3">

      {/* 1. Stats Row */}
      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
        <div className="grid grid-cols-2 gap-0">
          <div className="px-5 py-5 border-r border-border/30">
            {showUserGotMode ? (
              <>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  {payoutSendLabel || 'Cashback Received'}
                </p>
                <p className="font-syne font-black text-3xl leading-none mb-1" style={{ color: '#34d399' }}>
                  ₹{userGot}
                </p>
                {sendUserNote && (
                  <p className="text-[10px] text-muted-foreground mb-2 leading-tight">{sendUserNote}</p>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border mt-1 ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}>
                  <span className="text-xs animate-pulse">{detailEmoji}</span>
                  {displayStatus.toUpperCase()}
                </span>
              </>
            ) : showEstimateRow ? (
              <>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  {payoutUserLabel || 'Estimated Cashback'}
                </p>
                <p className="font-syne font-black text-3xl leading-none mb-3" style={{ color: '#f0b429' }}>₹{estimateUser}</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}>
                  <span className="text-xs animate-pulse">{detailEmoji}</span>
                  {displayStatus.toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Application Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border mt-3 ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}>
                  <span className="text-xs animate-pulse">{detailEmoji}</span>
                  {displayStatus.toUpperCase()}
                </span>
              </>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Current Status</p>
            <p className={`font-syne font-black text-lg leading-snug mb-2 ${statusColor.text}`}>{displayStatus}</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs ${getStatusEmojiAnimation(result.status)}`}>{detailEmoji}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Live Tracking</span>
            </div>
            {!showUserGotMode && showEstimateRow && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">{payoutUserLabel || 'Estimate'}</p>
                <p className="font-syne font-black text-base text-sky-400">₹{estimateUser}</p>
              </div>
            )}
          </div>
        </div>

        {showUserGotMode && perLeadShowEstimate && estimateUser > 0 && (
          <div className="border-t border-border/20 px-5 py-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                {payoutUserLabel || 'Estimate User'}
              </span>
              <span className="font-syne font-black text-base text-sky-400">₹{estimateUser}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Offer Banner */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 150 }}>
        {(result.offerBannerUrl || offer?.bannerUrl) ? (
          <img src={result.offerBannerUrl || offer?.bannerUrl} alt={result.offerName}
            className="w-full object-cover absolute inset-0 h-full" style={{ minHeight: 150 }} />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%)' }} />
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full z-10 border border-green-500/25"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
          <span className={`text-xs ${getStatusEmojiAnimation(result.status)}`}>{detailEmoji}</span>
          <span className="text-[9px] font-black text-green-400 uppercase tracking-wider">Live Tracking</span>
        </div>
        {offer?.logoUrl && (
          <div className="absolute top-3 left-3 z-10">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/20" style={{ backdropFilter: 'blur(8px)' }}>
              <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 z-10">
          <p className="font-syne font-black text-xl text-white leading-tight">{result.offerName}</p>
          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Lead ID: {result.leadId}</p>
        </div>
        <div className="relative z-0 h-[150px]" />
      </div>

      {/* 3. Status Timeline — hidden if admin disabled showStatusHistory for this lead (Module 3) */}
      {perLeadShowStatusHistory && (
        <div className="rounded-2xl border border-border/60 px-5 py-5 bg-card">
          <p className="font-syne font-black text-[10px] uppercase tracking-widest text-foreground/70 mb-5">Status Timeline</p>
          <StatusTimeline status={result.status} createdAt={result.createdAt} />
        </div>
      )}

      {/* 4. Status History */}
      {showHistorySection && (
        <div>
          <button onClick={() => setHistoryVisible(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-2xl border border-border/40 transition-all hover:border-primary/30 bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm">📋</span>
              <span className="font-syne font-black text-xs text-foreground/80 uppercase tracking-wider">Status History</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary">
                {result.statusHistory.length} update{result.statusHistory.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold">{historyVisible ? 'Hide' : 'Show'}</span>
              {historyVisible ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </div>
          </button>
          <AnimatePresence>
            {historyVisible && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="mt-2"><StatusHistoryLog history={result.statusHistory} /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 5. Sample Screenshot */}
      {result.sampleScreenshotUrl && (
        <div className="rounded-2xl border border-amber-500/30 overflow-hidden bg-card">
          <div className="px-5 pt-4 pb-3 border-b border-amber-500/20">
            <p className="font-syne font-black text-xs uppercase tracking-widest text-amber-400">📸 Sample Reference — How Your Completion Should Look</p>
          </div>
          <div className="px-5 py-4">
            <img src={result.sampleScreenshotUrl} alt="Sample Screenshot"
              className="w-full rounded-xl border border-border/40 object-cover"
              onError={e => ((e.currentTarget.closest('div') as HTMLElement).style.display = 'none')} />
            <p className="text-[10px] text-muted-foreground mt-2 text-center font-semibold">This is an example of a completed offer for your reference</p>
          </div>
        </div>
      )}

      {/* 6. Submitted Details */}
      <SubmittedDetails result={result} />

      {/* 7. Status Action Banner */}
      <StatusGlowBox
        status={result.status}
        publicRemark={result.publicRemark}
        payout={userGot > 0 ? userGot : estimateUser}
        leadId={result.id}
        offerRedirectLink={result.offerRedirectLink}
        actionConfig={result.actionConfig}
        telegramLink={telegramLink}
        supportEmail={supportEmail}
        paidDate={result.actionConfig?.showDatesTimestamps !== false ? result.paidDate : undefined}
        upiId={result.upiId}
        statusCtaConfig={statusCtaConfig}
        statusLabel={statusLabels?.[result.status]}
      />

      {/* 8. Support Buttons */}
      <ActionButtons telegramLink={telegramLink} supportEmail={supportEmail} />

      <div className="text-center pt-1 pb-2">
        <p className="text-[10px] font-bold" style={{ color: '#c4a04d' }}>🔒 100% Secure Tracking</p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrackLeadPanel({ prefilledUpi, offerNameFilter, offers, telegramLink, supportEmail }: Props) {
  const [searchParams] = useSearchParams();
  const { settings } = useAppContext();
  const urlUpi = useMemo(() => searchParams.get('upi') || '', [searchParams]);
  const urlLeadId = useMemo(() => searchParams.get('leadId') || '', [searchParams]);
  const initialUpi = prefilledUpi || urlUpi;

  // Default is now 'all' — shows every result without date restriction
  const [query, setQuery] = useState(initialUpi);
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<TrackResult[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string>('');

  const resultsRef = useRef<HTMLDivElement>(null);

  const effectiveTelegram = telegramLink || settings?.telegramLink || '';
  const effectiveSupport = supportEmail || settings?.supportEmail || '';

  // Derive searchable fields from leadFieldsConfig 🔎 toggles
  const searchableFieldLabels = useMemo(() => {
    if (!settings?.leadFieldsConfig) return ['UPI ID', 'Full Name', 'Mobile Number'];
    try {
      const parsed = JSON.parse(settings.leadFieldsConfig) as Array<{ label: string; enabled: boolean; searchable?: boolean }>;
      if (Array.isArray(parsed)) {
        const active = parsed.filter(f => f.enabled && f.searchable).map(f => f.label);
        return active.length > 0 ? active : ['UPI ID', 'Full Name', 'Mobile Number'];
      }
    } catch {}
    return ['UPI ID', 'Full Name', 'Mobile Number'];
  }, [settings?.leadFieldsConfig]);

  const trackByUpi = searchableFieldLabels.some(l => l.toLowerCase().includes('upi'));
  const trackByName = searchableFieldLabels.some(l => l.toLowerCase().includes('name'));
  const trackByMobile = searchableFieldLabels.some(l => l.toLowerCase().includes('mobile') || l.toLowerCase().includes('phone'));
  const trackByEmail = searchableFieldLabels.some(l => l.toLowerCase().includes('email'));

  const searchMode: 'upi' | 'name' | 'any' = 'any';

  // Dynamic placeholder based on searchable fields
  const searchPlaceholder = searchableFieldLabels.length > 0
    ? `Enter your ${searchableFieldLabels.join(', ')}`
    : 'Enter your UPI ID to track';

  const globalStatusCtaConfig: StatusCTAConfig = settings?.statusCtaConfig ?? DEFAULT_STATUS_CTA_CONFIG;
  const statusLabels = settings?.statusLabels ?? {};
  const statusHistoryMode = (settings?.statusHistoryMode || 'show') as 'show' | 'collapsed' | 'hidden';
  const payoutConfig = settings?.payoutConfig;
  // Note: showPayoutToUser is now controlled per-offer (returned from searchLeadsByUpi API)
  // The global payoutConfig labels are still used for display text

  const doSearch = useCallback(async (q: string, filter: DateFilter, start: string, end: string) => {
    // Multi-search: split by comma to search multiple values at once
    const terms = q.split(',').map(t => t.trim()).filter(t => t.length >= 3);
    if (terms.length === 0) { toast.error('Enter at least 3 characters per search term'); return; }
    // 30-day restriction on custom range
    if (filter === 'custom') {
      if (!start || !end) { toast.error('Please select both start and end dates'); return; }
      const diffDays = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) { toast.error('End date must be after start date'); return; }
      if (diffDays > 30) { toast.error('Custom date range cannot exceed 30 days'); return; }
    }
    setSearching(true); setHasSearched(false);
    try {
      // Phase 3: Only 24h, 7d, custom are valid — no 'all' option for users
      // Multi-term parallel search — merge & deduplicate results
      // Map frontend filter to API filter ('30d' → '1m' for API compatibility)
      const apiFilter = filter === '30d' ? '1m' : filter;
      const allResults = await Promise.all(terms.map(term =>
        searchLeadsByUpi({ upiId: term, dateFilter: apiFilter, startDate: start || undefined, endDate: end || undefined, searchMode, trackByUpi, trackByName, trackByMobile, trackByEmail, searchableFieldLabels })
      ));
      const seenIds = new Set<string>();
      const allLeads: typeof allResults[0]['leads'] = [];
      allResults.forEach(res => res.leads.forEach(l => {
        if (!seenIds.has(l.id)) { seenIds.add(l.id); allLeads.push(l); }
      }));
      let filtered = offerNameFilter ? allLeads.filter(l => l.offerName.toLowerCase().includes(offerNameFilter.toLowerCase())) : allLeads;
      // ── Module 1: Strict client-side timestamp filter (defense-in-depth) ──
      // CRITICAL: Use submissionDate (admin display override) when present, else createdAt.
      // This ensures a lead showing "Date of Submission: 25 Mar 2026" is correctly
      // filtered OUT by the 7-day filter, even if createdAt is recent.
      const _nowMs = Date.now();
      const _getEffectiveTs = (l: typeof filtered[0]): number => {
        const dateStr = (l.submissionDate && l.submissionDate.trim()) ? l.submissionDate : l.createdAt;
        if (!dateStr) return 0;
        const ts = new Date(dateStr).getTime();
        return isNaN(ts) ? 0 : ts;
      };
      if (filter === '7d') {
        const _LIMIT = 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(l => {
          const ts = _getEffectiveTs(l);
          return ts > 0 && (_nowMs - ts) <= _LIMIT;
        });
      } else if (filter === '30d') {
        const _LIMIT = 30 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter(l => {
          const ts = _getEffectiveTs(l);
          return ts > 0 && (_nowMs - ts) <= _LIMIT;
        });
      } else if (filter === '24h') {
        const _LIMIT = 24 * 60 * 60 * 1000;
        filtered = filtered.filter(l => {
          const ts = _getEffectiveTs(l);
          return ts > 0 && (_nowMs - ts) <= _LIMIT;
        });
      } else if (filter === 'custom' && start && end) {
        const _sTs = new Date(start).getTime();
        const _eD = new Date(end); _eD.setHours(23, 59, 59, 999);
        filtered = filtered.filter(l => {
          const ts = _getEffectiveTs(l);
          return ts > 0 && ts >= _sTs && ts <= _eD.getTime();
        });
      }
      const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Auto-retry with broader range if 7d/24h returned 0 results
      if (sorted.length === 0 && (filter === '7d' || filter === '24h') && allLeads.length > 0) {
        // There ARE leads matching the search, just not in the date window — auto-expand to 30d
        setDateFilter('30d');
        toast.info('No leads in this period — expanded to 30 days');
        setSearching(false);
        doSearch(q, '30d', '', '');
        return;
      }
      setResults(sorted);
      setActiveLeadId(sorted[0]?.id || '');
      setHasSearched(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch { toast.error('Search failed. Try again.'); }
    finally { setSearching(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerNameFilter, searchMode, trackByUpi, trackByName, trackByMobile, trackByEmail, searchableFieldLabels]);

  // Phase 3: Pre-filled UPI auto-search uses 7d default (strict)
  useEffect(() => {
    const upiToSearch = prefilledUpi || urlUpi;
    if (upiToSearch && upiToSearch.length >= 3) { setQuery(upiToSearch); doSearch(upiToSearch, '7d', '', ''); }
  }, [prefilledUpi, urlUpi, doSearch]);

  useEffect(() => {
    if (urlLeadId && results.length > 0) {
      const lead = results.find(r => r.leadId === urlLeadId || r.id === urlLeadId);
      if (lead) setActiveLeadId(lead.id);
    }
  }, [urlLeadId, results]);

  function handleLeadSelect(id: string) {
    setActiveLeadId(id);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  // Phase 3: Strict filter options — no "All Time" for users
  const DATE_FILTERS: { id: DateFilter; label: string; desc: string }[] = [
    { id: '24h', label: '24 Hours', desc: 'Last 24 hrs' },
    { id: '7d', label: '7 Days', desc: 'Last week' },
    { id: '30d', label: '30 Days', desc: 'Last month' },
    { id: 'custom', label: 'Custom', desc: 'Pick dates' },
  ];

  // Only show the active lead
  const activeResult = results.find(r => r.id === activeLeadId) || results[0];

  return (
    <div className="space-y-4 pb-10">
      {offerNameFilter && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20" style={{ background: 'rgba(59,130,246,0.05)' }}>
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-sm flex-shrink-0">🎯</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-foreground">Offer-Specific Tracking</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Showing: <strong className="text-primary">{offerNameFilter}</strong></p>
          </div>
        </div>
      )}

      {/* Search Card */}
      <div className="rounded-2xl border border-border/60 p-5 space-y-4 bg-card shadow-lg">
        <div>
          <p className="font-syne font-black text-foreground text-sm">
            🔍 {offerNameFilter ? `Track ${offerNameFilter}` : 'Track Your Cashback'}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Search by {searchableFieldLabels.join(', ')}</p>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query, dateFilter, customStart, customEnd)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-3.5 bg-background/60 border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi placeholder:text-muted-foreground/40" />
        </div>
        {query.includes(',') && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {query.split(',').map(t => t.trim()).filter(Boolean).map((term, i) => (
              <span key={i} className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${term.length >= 3 ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-red-500/10 border-red-500/25 text-red-400'}`}>
                🔍 {term} {term.length < 3 && '(min 3)'}
              </span>
            ))}
          </div>
        )}
        <p className="text-[9px] text-muted-foreground/50 mt-1.5 flex items-center gap-1">💡 Use commas to search multiple values at once</p>

        <div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Search Period</p>
          <div className="flex gap-2">
            {DATE_FILTERS.map(f => (
              <button key={f.id} onClick={() => setDateFilter(f.id)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${dateFilter === f.id ? 'bg-primary border-primary text-white shadow-lg' : 'bg-background/40 border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
                <div>{f.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5 font-normal">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">From Date</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background/60 border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">To Date</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background/60 border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>
            <p className="text-[10px] text-amber-400/70 font-semibold">⚠️ Max 30 days range allowed</p>
          </div>
        )}

        <motion.button onClick={() => doSearch(query, dateFilter, customStart, customEnd)} disabled={searching}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-xl font-syne font-black text-sm text-black disabled:opacity-60 transition-all relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f0b429 0%, #ff5722 100%)', boxShadow: searching ? 'none' : '0 6px 20px rgba(240,180,41,0.28)' }}>
          <div className="card-shine" />
          {searching ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />Searching…
            </span>
          ) : '🔍 Track My Lead →'}
        </motion.button>
      </div>

      {/* Skeleton */}
      {searching && (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-4 animate-pulse bg-card">
              <div className="flex justify-between items-start"><div className="h-8 w-24 bg-border/40 rounded" /><div className="h-6 w-20 bg-border/40 rounded-full" /></div>
              <div className="h-36 w-full bg-border/40 rounded-xl" /><div className="h-14 w-full bg-border/40 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!searching && hasSearched && results.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          {/* Horizontal Tab Buttons — no scroll, wrapping layout */}
          <LeadTabButtons results={results} activeId={activeLeadId} onSelect={handleLeadSelect} />

          {results.length === 1 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs status-emoji-pulse">🔄</span>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                1 Application Found
              </p>
            </div>
          )}

          {/* Only show the active lead card */}
          <AnimatePresence mode="wait">
            {activeResult && (() => {
              const matchedOffer = offers?.find(o => o.name.toLowerCase() === activeResult.offerName.toLowerCase());
              return (
                <ResultCard key={activeResult.id}
                  result={activeResult}
                  offer={matchedOffer}
                  telegramLink={effectiveTelegram}
                  supportEmail={effectiveSupport}
                  statusCtaConfig={globalStatusCtaConfig}
                  statusLabels={statusLabels}
                  statusHistoryMode={statusHistoryMode}
                  payoutUserLabel={payoutConfig?.userPayoutLabel || 'Estimated Cashback'}
                  payoutSendLabel={payoutConfig?.sendUserLabel || 'Cashback Received'}
                />
              );
            })()}
          </AnimatePresence>
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="text-center py-14 rounded-2xl border border-border/40 bg-card">
          <div className="text-4xl mb-4">🔍</div>
          <p className="font-syne font-black text-base text-foreground mb-2">No Applications Found</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            No leads found. Try a different search term or date range.
          </p>
        </div>
      )}

      {!searching && !hasSearched && (
        <div className="text-center py-12 rounded-2xl border border-border/30 bg-card">
          <div className="text-4xl mb-3">💰</div>
          <p className="font-syne font-black text-sm text-foreground mb-1">Check Your Cashback Status</p>
          <p className="text-xs text-muted-foreground">
            {offerNameFilter ? `Enter your ${searchPlaceholder} to track ${offerNameFilter}` : `Enter your ${searchPlaceholder} above`}
          </p>
        </div>
      )}
    </div>
  );
}
