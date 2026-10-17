import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@project/components/ui/accordion';
import type { Offer } from '@/types';

interface Props {
  offer: Offer;
  tags: string[];
  onApply: () => void;
}

// ── Live Countdown Hook ────────────────────────────────────────────────────────
function useCountdown(expiresAt?: string) {
  const [countdown, setCountdown] = useState<{ text: string; urgent: boolean; expired: boolean }>({ text: '', urgent: false, expired: false });

  useEffect(() => {
    if (!expiresAt) { setCountdown({ text: '', urgent: false, expired: false }); return; }

    function update() {
      const now = Date.now();
      const end = new Date(expiresAt!).getTime();
      const diff = end - now;
      if (diff <= 0) { setCountdown({ text: 'EXPIRED', urgent: true, expired: true }); return; }
      const totalMins = Math.floor(diff / 60000);
      const totalHours = Math.floor(diff / 3600000);
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const mins = totalMins % 60;
      const secs = Math.floor((diff % 60000) / 1000);

      let text = '';
      let urgent = false;
      if (days >= 7) { text = `${days} days left`; }
      else if (days >= 2) { text = `${days} days left`; }
      else if (days === 1) { text = `1 day ${hours}h left`; urgent = true; }
      else if (totalHours >= 12) { text = `${totalHours} hours left`; urgent = true; }
      else if (totalHours >= 1) { text = `${totalHours}h ${mins}m left`; urgent = true; }
      else { text = `${mins}m ${secs}s left`; urgent = true; }

      setCountdown({ text, urgent, expired: false });
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return countdown;
}

// ── Slots Progress Bar ─────────────────────────────────────────────────────────
function SlotsBar({ total, filled }: { total: number; filled: number }) {
  const remaining = Math.max(0, total - filled);
  const pct = Math.min(100, (filled / total) * 100);
  const isAlmostFull = remaining <= Math.ceil(total * 0.2);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: isAlmostFull ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.3)',
        background: isAlmostFull ? 'rgba(239,68,68,0.06)' : 'rgba(240,180,41,0.06)',
      }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <motion.span
            className="text-xs font-black"
            style={{ color: isAlmostFull ? '#ef4444' : '#f0b429' }}
            animate={{ scale: isAlmostFull ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: isAlmostFull ? Infinity : 0, duration: 1.5 }}
          >
            🔥 Only {remaining}/{total} slots left
          </motion.span>
          {isAlmostFull && (
            <motion.span
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              FILLING FAST
            </motion.span>
          )}
        </div>
        <div className="h-2 rounded-full bg-border/30 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              background: isAlmostFull
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : 'linear-gradient(90deg, #f0b429, #ff5722)',
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">{Math.round(pct)}% filled</p>
      </div>
    </motion.div>
  );
}

// ── Timer Banner ───────────────────────────────────────────────────────────────
function TimerBanner({ text, urgent, expired }: { text: string; urgent: boolean; expired: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: expired ? 'rgba(239,68,68,0.5)' : urgent ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.35)',
        background: expired ? 'rgba(239,68,68,0.08)' : urgent ? 'rgba(239,68,68,0.06)' : 'rgba(240,180,41,0.06)',
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <motion.span
          className="text-xl flex-shrink-0"
          animate={urgent && !expired ? { rotate: [0, -10, 10, -5, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
        >
          {expired ? '⛔' : urgent ? '⏰' : '⏳'}
        </motion.span>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: urgent || expired ? '#ef4444' : '#f0b429' }}>
            {expired ? 'Offer Expired' : 'Limited Time Offer'}
          </p>
          <motion.p
            className="font-syne font-black text-lg leading-tight"
            style={{ color: expired ? '#ef4444' : urgent ? '#ef4444' : '#f0b429' }}
            animate={urgent && !expired ? { opacity: [1, 0.7, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            {text}
          </motion.p>
        </div>
        {!expired && (
          <motion.div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: urgent ? '#ef4444' : '#f0b429' }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function LiveOfferTab({ offer, tags, onApply }: Props) {
  const countdown = useCountdown(offer.expiresAt);
  const hasSlots = (offer.totalSlots || 0) > 0;
  const hasTimer = !!offer.expiresAt;
  const slotsRemaining = hasSlots ? Math.max(0, offer.totalSlots - (offer.filledSlots || 0)) : null;

  // Parse termsExpanded from fieldsConfig wrapper
  const termsExpanded = (() => {
    try {
      const parsed = JSON.parse(offer.fieldsConfig || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Boolean(parsed.termsExpanded);
    } catch {}
    return false;
  })();

  return (
    <div className="py-6 space-y-5 pb-24 md:pb-8">

      {/* ── Timer Banner ── */}
      {hasTimer && countdown.text && (
        <TimerBanner text={countdown.text} urgent={countdown.urgent} expired={countdown.expired} />
      )}

      {/* ── Slots Progress Bar ── */}
      {hasSlots && (
        <SlotsBar total={offer.totalSlots} filled={offer.filledSlots || 0} />
      )}

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-card border border-border px-3 py-1.5 rounded-full">
              <span className="text-green-400">✓</span> {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Cashback reward card ── */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">YOU EARN</p>
          <p className="font-syne font-black text-4xl text-gold mt-1">₹{offer.payout}</p>
          <p className="text-xs text-muted-foreground mt-1">On successful completion</p>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-green-400">⚡ Within 24-48 hours</div>
          <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-blue-400">✓ Verified Offer</div>
          {slotsRemaining !== null && slotsRemaining <= 20 && (
            <motion.div
              className="flex items-center gap-1.5 justify-end text-xs font-bold"
              style={{ color: '#ef4444' }}
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              🔥 {slotsRemaining} slots left
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Description ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
      </div>

      {/* ── Steps accordion ── */}
      {offer.steps && (
        <Accordion type="single" collapsible defaultValue="steps">
          <AccordionItem value="steps" className="border border-border bg-card rounded-2xl px-4 overflow-hidden">
            <AccordionTrigger className="font-syne font-black text-sm py-4 hover:no-underline">
              📋 How to Complete & Claim Cashback
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-4">
                {offer.steps.split('\n').filter(Boolean).map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-gold font-black text-xs">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* ── T&C ── */}
      <Accordion type="single" collapsible defaultValue={termsExpanded ? 'tc' : undefined}>
        <AccordionItem value="tc" className="border border-border bg-card rounded-2xl px-4 overflow-hidden">
          <AccordionTrigger className="font-syne font-black text-sm py-4 hover:no-underline">⚖️ Terms & Conditions</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm text-muted-foreground pb-4">
              {offer.termsAndConditions ? (
                offer.termsAndConditions.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))
              ) : (
                <>
                  <p>• Valid for new users only unless stated otherwise</p>
                  <p>• Submit clear proof of task completion</p>
                  <p>• Cashback processed within 7–14 business days after approval</p>
                  <p>• Multiple submissions from same UPI/device will be rejected</p>
                  <p>• Fraudulent or fake submissions will be permanently disqualified</p>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Apply CTA ── */}
      <motion.button
        onClick={onApply}
        disabled={countdown.expired || (hasSlots && slotsRemaining === 0)}
        whileHover={!countdown.expired ? { y: -2 } : {}}
        whileTap={!countdown.expired ? { scale: 0.98 } : {}}
        className="w-full py-4 rounded-2xl font-syne font-black text-base text-black shadow-lg transition-all hover:opacity-90 active:scale-[0.98] bg-gradient-to-r from-gold to-fire disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
      >
        <div className="card-shine" />
        {countdown.expired
          ? '⛔ Offer Expired'
          : hasSlots && slotsRemaining === 0
            ? '🚫 All Slots Filled'
            : `📝 Fill Form & Claim ₹${offer.payout} →`}
      </motion.button>
    </div>
  );
}
