import { motion } from 'framer-motion';
import type { TargetAndTransition } from 'framer-motion';
import type { UIButtonConfig, UIButtonAnimation } from '@/types';

interface Props {
  config: UIButtonConfig;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Pass true when the parent container handles alignment (e.g. flex-1 rows) */
  noAlign?: boolean;
}

const ANIMATION_VARIANTS: Record<UIButtonAnimation, TargetAndTransition> = {
  none: {},
  pulse: { scale: [1, 1.04, 1] },
  bounce: { y: [0, -5, 0] },
  glow: { boxShadow: ['0 0 0px rgba(240,180,41,0)', '0 0 24px rgba(240,180,41,0.6)', '0 0 0px rgba(240,180,41,0)'] },
  shake: { x: [0, -4, 4, -4, 4, 0] },
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
  xl: 'px-10 py-5 text-lg',
};

const ALIGN_CLASSES: Record<string, string> = {
  left:   'self-start',
  center: 'self-center mx-auto',
  right:  'self-end ml-auto',
  full:   'w-full',
};

export default function DynamicButton({
  config, onClick, className = '', children, disabled, type = 'button', noAlign = false,
}: Props) {
  const sizeClass  = SIZE_CLASSES[config.size]  || SIZE_CLASSES.md;
  const alignClass = noAlign ? '' : (ALIGN_CLASSES[config.align] || '');
  const animVariant = ANIMATION_VARIANTS[config.animation] || {};
  const isAnimated  = config.animation !== 'none';

  const style: React.CSSProperties = {
    backgroundColor: config.bgColor,
    color: config.textColor,
    borderColor: config.borderColor === 'transparent' ? 'transparent' : config.borderColor,
    borderWidth: config.borderColor === 'transparent' ? 0 : 1,
    borderStyle: 'solid',
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      animate={isAnimated ? animVariant : undefined}
      transition={isAnimated
        ? { repeat: Infinity, duration: config.animation === 'shake' ? 0.5 : 2, ease: 'easeInOut' }
        : undefined}
      whileHover={!disabled ? { opacity: 0.88, scale: 1.02 } : undefined}
      whileTap={!disabled   ? { scale: 0.96 }               : undefined}
      className={`font-syne font-black rounded-xl transition-all disabled:opacity-50 ${sizeClass} ${alignClass} ${className}`}
    >
      {children ?? config.text}
    </motion.button>
  );
}
