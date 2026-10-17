import { motion } from 'framer-motion';

/** Canonical status type */
export type CanonicalStatusKey = 'pending' | 'onHold' | 'approved' | 'cashbackSent' | 'missing';

/** Map raw status string to canonical key */
export function classifyStatus(s: string): CanonicalStatusKey {
  const l = s.toLowerCase().trim();
  if (l === 'paid' || l === 'cashback sent') return 'cashbackSent';
  if (l === 'approved') return 'approved';
  if (l === 'rejected' || l === 'missing') return 'missing';
  if (l === 'on hold' || l === 'hold' || l === 'duplicate') return 'onHold';
  return 'pending';
}

/** Status → animated emoji mapping (for indicators) */
const STATUS_EMOJIS: Record<CanonicalStatusKey, string> = {
  pending: '🔄',
  onHold: '⏸️',
  approved: '⏳',
  cashbackSent: '✅',
  missing: '❌',
};

/** Status → color dot emoji (for selectable cards only) */
export const STATUS_COLOR_EMOJIS: Record<CanonicalStatusKey, string> = {
  pending: '🟡',
  onHold: '🟠',
  approved: '⚪',
  cashbackSent: '🟢',
  missing: '🔴',
};

/** Get the animated status emoji for any raw status string */
export function getStatusEmoji(s: string): string {
  return STATUS_EMOJIS[classifyStatus(s)];
}

/** Get the color dot emoji for selectable cards */
export function getStatusColorEmoji(s: string): string {
  return STATUS_COLOR_EMOJIS[classifyStatus(s)];
}

/** Animation configs per status */
const ANIMATIONS: Record<CanonicalStatusKey, {
  animate: Record<string, number[] | string[]>;
  transition: Record<string, unknown>;
}> = {
  pending: {
    animate: { rotate: [0, 360] },
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
  onHold: {
    animate: { scale: [1, 1.15, 1], opacity: [1, 0.6, 1] },
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
  approved: {
    animate: { y: [0, -2, 0], scale: [1, 1.05, 1] },
    transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
  },
  cashbackSent: {
    animate: { scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] },
    transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
  },
  missing: {
    animate: { x: [-1, 1, -1, 1, 0], scale: [1, 1.1, 1] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

interface StatusEmojiProps {
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = { xs: 'text-[10px]', sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

/** Animated status emoji component */
export default function StatusEmoji({ status, size = 'sm', animated = true, className = '' }: StatusEmojiProps) {
  const key = classifyStatus(status);
  const emoji = STATUS_EMOJIS[key];
  const anim = ANIMATIONS[key];
  const sizeClass = SIZE_MAP[size];

  if (!animated) {
    return <span className={`${sizeClass} ${className}`}>{emoji}</span>;
  }

  return (
    <motion.span
      className={`inline-flex ${sizeClass} ${className}`}
      animate={anim.animate}
      transition={anim.transition}
    >
      {emoji}
    </motion.span>
  );
}
