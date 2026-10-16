import { appPath } from '@/lib/appUrl';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { recordActionClick } from 'zitejs/api';
import type { StatusCTAConfigV2, CanonicalStatus, CustomCTAEntry } from '@/types';
import { DEFAULT_STATUS_CTA_V2 } from '@/types';

interface ActionCfg {
  actionMessage?: string;
  buttonLabel?: string;
  buttonRedirectUrl?: string;
  buttonColor?: string;
  ctaEmoji?: string;
}

interface Props {
  status: string;
  publicRemark?: string;
  payout?: number;
  leadId: string;
  offerRedirectLink?: string;
  actionConfig?: ActionCfg;
  telegramLink?: string;
  supportEmail?: string;
  paidDate?: string;
  upiId?: string;
  statusCtaConfig?: StatusCTAConfigV2;
  statusLabel?: string;
}

/** Map any raw status string to one of the 5 canonical statuses */
function classify(s: string): CanonicalStatus {
  const l = s.toLowerCase().trim();
  // Cashback Sent / Paid
  if (l === 'paid' || l === 'cashback sent') return 'cashbackSent';
  // Approved (but NOT paid yet)
  if (l === 'approved') return 'approved';
  // Rejected → mapped to Missing (rejection info stored as reason/detail)
  if (l === 'rejected') return 'missing';
  // Missing
  if (l === 'missing') return 'missing';
  // On Hold — includes duplicate, verification, etc.
  if (l === 'on hold' || l === 'hold' || l === 'duplicate') return 'onHold';
  // Pending — includes incomplete, under review, processing, pending
  return 'pending';
}

function formatPaidDate(iso: string) {
  try {
    const dt = new Date(iso);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const h = dt.getHours();
    const min = String(dt.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${dd}/${mm}/${yyyy}, ${h12}:${min} ${ampm}`;
  } catch { return iso; }
}

// ─── Visual configs per canonical status ──────────────────────────────────────
const VISUALS: Record<CanonicalStatus, {
  bg: string; border: string; glow: string; color: string; glowRgba: string;
  title: string; statusEmoji: string;
  btnBg: string; btnShadow: string; ticker: string;
  pulseSpeed: number; pulseIntensity: number;
}> = {
  pending: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(234,88,12,0.07))',
    border: 'rgba(245,158,11,0.5)', glow: '0 0 20px rgba(245,158,11,0.4), 0 0 45px rgba(245,158,11,0.1)',
    color: '#fbbf24', glowRgba: 'rgba(245,158,11,0.4)',
    title: 'Lead Processing — Action May Be Required', statusEmoji: '🔄',
    btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    btnShadow: '0 6px 24px rgba(245,158,11,0.45)',
    ticker: 'Processing • Check Status', pulseSpeed: 1.8, pulseIntensity: 0.3,
  },
  onHold: {
    bg: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(234,88,12,0.07))',
    border: 'rgba(249,115,22,0.55)', glow: '0 0 20px rgba(249,115,22,0.5), 0 0 45px rgba(249,115,22,0.1)',
    color: '#fb923c', glowRgba: 'rgba(249,115,22,0.4)',
    title: 'Lead On Hold — Requires Your Attention', statusEmoji: '⏸️',
    btnBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    btnShadow: '0 6px 24px rgba(249,115,22,0.45)',
    ticker: 'Requires Attention', pulseSpeed: 2.5, pulseIntensity: 0.22,
  },
  approved: {
    bg: 'linear-gradient(135deg, rgba(148,163,184,0.12), rgba(100,116,139,0.06))',
    border: 'rgba(148,163,184,0.45)', glow: '0 0 18px rgba(148,163,184,0.3), 0 0 40px rgba(148,163,184,0.08)',
    color: '#94a3b8', glowRgba: 'rgba(148,163,184,0.3)',
    title: 'Lead Approved — Cashback Processing', statusEmoji: '⏳',
    btnBg: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    btnShadow: '0 6px 24px rgba(148,163,184,0.4)',
    ticker: 'Approved • Cashback Pending', pulseSpeed: 2, pulseIntensity: 0.18,
  },
  cashbackSent: {
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.17), rgba(22,163,74,0.09))',
    border: 'rgba(34,197,94,0.65)', glow: '0 0 30px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.18)',
    color: '#22c55e', glowRgba: 'rgba(34,197,94,0.5)',
    title: 'Cashback Sent Successfully', statusEmoji: '✅',
    btnBg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    btnShadow: '0 6px 30px rgba(34,197,94,0.6)',
    ticker: '🎉 Payment Complete', pulseSpeed: 1.8, pulseIntensity: 0.25,
  },
  missing: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.07))',
    border: 'rgba(239,68,68,0.55)', glow: '0 0 20px rgba(239,68,68,0.5), 0 0 45px rgba(239,68,68,0.1)',
    color: '#f87171', glowRgba: 'rgba(239,68,68,0.4)',
    title: 'Lead Not Found — Contact Support', statusEmoji: '❌',
    btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    btnShadow: '0 6px 24px rgba(239,68,68,0.45)',
    ticker: 'Lead Missing • Action Required', pulseSpeed: 2, pulseIntensity: 0.25,
  },
};

// ─── Confetti for cashbackSent ─────────────────────────────────────────────────
const CONFETTI = [
  { left: '8%', delay: 0, color: '#22c55e', w: 8, h: 8 },
  { left: '22%', delay: 0.18, color: '#f0b429', w: 6, h: 10 },
  { left: '38%', delay: 0.08, color: '#4ade80', w: 8, h: 5 },
  { left: '54%', delay: 0.28, color: '#fff', w: 5, h: 8 },
  { left: '68%', delay: 0.13, color: '#a3e635', w: 7, h: 6 },
  { left: '82%', delay: 0.05, color: '#38bdf8', w: 8, h: 8 },
  { left: '14%', delay: 0.22, color: '#f472b6', w: 5, h: 9 },
  { left: '91%', delay: 0.33, color: '#fbbf24', w: 6, h: 7 },
  { left: '46%', delay: 0.16, color: '#c084fc', w: 7, h: 5 },
  { left: '73%', delay: 0.26, color: '#22c55e', w: 5, h: 8 },
];

function ConfettiLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {CONFETTI.map((p, i) => (
        <motion.div key={i} className="absolute rounded-sm"
          style={{ left: p.left, width: p.w, height: p.h, background: p.color, top: 0 }}
          animate={{ y: ['0px', '85px'], opacity: [0, 1, 1, 0], rotate: [0, 360] }}
          transition={{ duration: 1.8, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: 2.8 }}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <motion.span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white inline-block"
      animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
  );
}

function hexToGradient(hex: string): string {
  return `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)`;
}
function hexToGlow(hex: string): string {
  return `0 6px 24px ${hex}55`;
}

/** Check if custom CTA should display for this lead */
function shouldShowCustomCTA(custom: CustomCTAEntry, status: string): boolean {
  if (!custom.enabled) return false;
  // Date window check
  const now = Date.now();
  if (custom.startDate) { const s = new Date(custom.startDate).getTime(); if (!isNaN(s) && now < s) return false; }
  if (custom.endDate) { const e = new Date(custom.endDate).getTime(); if (!isNaN(e) && now > e) return false; }
  // Status targeting
  if (custom.targetStatuses.length > 0) {
    const l = status.toLowerCase();
    if (!custom.targetStatuses.some(t => t.toLowerCase() === l)) return false;
  }
  return true;
}

export default function StatusGlowBox({
  status, publicRemark, payout, leadId,
  offerRedirectLink, actionConfig, telegramLink, supportEmail,
  paidDate, upiId, statusCtaConfig, statusLabel,
}: Props) {
  const [clicking, setClicking] = useState(false);
  const [clickingCustom, setClickingCustom] = useState(false);

  const type = classify(status);
  const vis = VISUALS[type];
  const cfg = statusCtaConfig ?? DEFAULT_STATUS_CTA_V2;
  const ctaEntry = cfg[type];
  const customCta = cfg.custom;
  const showCustom = shouldShowCustomCTA(customCta, status);

  const supportUrl =
    telegramLink ||
    (supportEmail && supportEmail.includes('@') ? `mailto:${supportEmail}` : supportEmail) ||
    '/';

  // Default redirect URLs per status
  const defaultUrls: Record<CanonicalStatus, string> = {
    pending: offerRedirectLink || '/',
    onHold: supportUrl,
    approved: '/',
    cashbackSent: '/',
    missing: supportUrl,
  };

  // Resolve final button values (per-lead override → global CTA → visual fallback)
  const btnEmoji = actionConfig?.ctaEmoji?.trim() || ctaEntry.emoji || '→';
  const btnLabel = actionConfig?.buttonLabel?.trim() || ctaEntry.label;
  const btnUrl = actionConfig?.buttonRedirectUrl?.trim() || ctaEntry.url || defaultUrls[type];
  const adminMessage = publicRemark || actionConfig?.actionMessage || ctaEntry.message;

  // Color priority: per-lead > CTA entry > visual default
  const customHex = actionConfig?.buttonColor?.trim() || ctaEntry.color?.trim() || '';
  const btnStyle = customHex
    ? { background: hexToGradient(customHex), boxShadow: hexToGlow(customHex) }
    : { background: vis.btnBg, boxShadow: vis.btnShadow };

  const isCashbackSent = type === 'cashbackSent';
  const isPending = type === 'pending';
  const needsPulse = type !== 'cashbackSent';

  const displayStatus = statusLabel || status;

  async function handleClick() {
    if (clicking) return;
    setClicking(true);
    try { await recordActionClick({ leadDbId: leadId }); } catch { /* noop */ }
    if (btnUrl && btnUrl !== '/') window.open(btnUrl, '_blank');
    else window.location.href = appPath('/');
    setTimeout(() => setClicking(false), 3500);
  }

  async function handleCustomClick() {
    if (clickingCustom || !customCta.url) return;
    setClickingCustom(true);
    try { await recordActionClick({ leadDbId: leadId }); } catch { /* noop */ }
    window.open(customCta.url, '_blank');
    setTimeout(() => setClickingCustom(false), 3500);
  }

  return (
    <div className="space-y-3">
      {/* ─── Main Status CTA Card ─── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.32, ease: 'easeOut', delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ background: vis.bg, border: `1px solid ${vis.border}`, boxShadow: vis.glow }}
      >
        {needsPulse && (
          <motion.div className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0, vis.pulseIntensity, 0] }}
            transition={{ duration: vis.pulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: `radial-gradient(circle at 22% 55%, ${vis.glowRgba}, transparent 65%)` }}
          />
        )}
        {isCashbackSent && <ConfettiLayer />}

        {/* ── STATUS → COMMENT → CTA hierarchy ── */}
        <div className="relative px-5 pt-5 pb-3 flex items-start gap-4">
          {/* Status emoji icon */}
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
            style={{ background: `${vis.glowRgba}`, border: `1px solid ${vis.border}` }}>
            {isPending ? (
              <div className="relative w-7 h-7 flex items-center justify-center">
                <motion.div className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: vis.color, borderTopColor: 'transparent' }}
                  animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
                <span className="relative z-10 text-sm">{vis.statusEmoji}</span>
              </div>
            ) : isCashbackSent ? (
              <motion.span className="text-xl"
                animate={{ scale: [1, 1.22, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}>{vis.statusEmoji}</motion.span>
            ) : (
              <motion.span className="text-xl"
                animate={{ scale: [1, 1.09, 1] }}
                transition={{ duration: vis.pulseSpeed, repeat: Infinity }}>{vis.statusEmoji}</motion.span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* STATUS title */}
            <motion.p className="font-syne font-black text-sm leading-snug" style={{ color: isCashbackSent ? '#16a34a' : vis.color }}>
              {vis.title}
            </motion.p>

            {/* Custom status label badge */}
            {statusLabel && statusLabel !== status && (
              <div className="mt-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                  style={{ color: vis.color, borderColor: vis.border, background: 'rgba(0,0,0,0.2)' }}>
                  {displayStatus.toUpperCase()}
                </span>
              </div>
            )}

            {/* Cashback Sent details */}
            {isCashbackSent && (
              <div className="mt-1.5 space-y-1">
                {payout ? (
                  <motion.p className="font-syne font-black text-2xl leading-none" style={{ color: '#15803d' }}
                    animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    +₹{payout}
                  </motion.p>
                ) : null}
                {upiId && (
                  <p className="text-xs flex items-center gap-1.5 font-bold" style={{ color: '#22c55e', opacity: 0.88 }}>
                    <span>💳</span><span>Cashback sent to: <strong>{upiId}</strong></span>
                  </p>
                )}
                {paidDate && (
                  <p className="text-xs flex items-center gap-1.5 font-semibold" style={{ color: '#22c55e', opacity: 0.75 }}>
                    <span>📅</span><span>{formatPaidDate(paidDate)}</span>
                  </p>
                )}
              </div>
            )}

            {/* COMMENT / message */}
            {adminMessage && (
              <p className="text-xs mt-2 leading-relaxed font-medium" style={{ color: vis.color, opacity: 0.78 }}>
                {adminMessage}
              </p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-5 pb-4 pt-1">
          <motion.button
            onClick={handleClick} disabled={clicking}
            whileHover={clicking ? {} : { scale: 1.025, y: -1 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-xl font-syne font-black text-sm text-white relative overflow-hidden transition-all disabled:opacity-70"
            style={clicking ? { background: btnStyle.background, opacity: 0.7 } : btnStyle}>
            <div className="card-shine" />
            {clicking ? (
              <span className="flex items-center justify-center gap-2"><Spinner />Processing…</span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>{btnEmoji}</span>
                <span>{btnLabel}</span>
              </span>
            )}
          </motion.button>
        </div>

        {/* Ticker footer */}
        <div className="px-5 py-2 flex items-center gap-2 border-t" style={{ borderColor: vis.border }}>
          <span className="text-sm animate-pulse" style={{ animationDuration: `${vis.pulseSpeed}s`, filter: `drop-shadow(0 0 4px ${vis.glowRgba})` }}>{vis.statusEmoji}</span>
          <span className="text-[9px] font-black uppercase tracking-widest ml-1 animate-pulse" style={{ color: vis.color }}>
            {vis.ticker}
          </span>
        </div>
      </motion.div>

      {/* ─── Custom CTA (separate card, never overwrites the status CTA) ─── */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl border"
          style={{
            background: `linear-gradient(135deg, ${customCta.color}18, ${customCta.color}08)`,
            borderColor: `${customCta.color}55`,
            boxShadow: `0 0 16px ${customCta.color}25`,
          }}
        >
          <div className="px-5 pt-4 pb-2 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${customCta.color}22`, border: `1px solid ${customCta.color}44` }}>
              {customCta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-relaxed" style={{ color: customCta.color, opacity: 0.85 }}>
                {customCta.message}
              </p>
            </div>
          </div>
          <div className="px-5 pb-4 pt-1">
            <motion.button
              onClick={handleCustomClick} disabled={clickingCustom || !customCta.url}
              whileHover={clickingCustom ? {} : { scale: 1.025, y: -1 }} whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl font-syne font-black text-sm text-white relative overflow-hidden transition-all disabled:opacity-60"
              style={clickingCustom
                ? { background: hexToGradient(customCta.color), opacity: 0.7 }
                : { background: hexToGradient(customCta.color), boxShadow: hexToGlow(customCta.color) }
              }>
              <div className="card-shine" />
              {clickingCustom ? (
                <span className="flex items-center justify-center gap-2"><Spinner />Processing…</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>{customCta.emoji}</span>
                  <span>{customCta.label}</span>
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
