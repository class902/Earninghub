import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface Props {
  verified: boolean;
  onVerify: () => void;
  className?: string;
}

export default function RecaptchaWidget({ verified, onVerify, className = '' }: Props) {
  const [checking, setChecking] = useState(false);

  function handleClick() {
    if (verified || checking) return;
    setChecking(true);
    setTimeout(() => { setChecking(false); onVerify(); }, 1500);
  }

  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
        verified ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-background/60'
      } ${className}`}
    >
      {/* Left: Checkbox + label */}
      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={verified || checking}
          whileTap={!verified && !checking ? { scale: 0.85 } : {}}
          className={`relative w-[22px] h-[22px] rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            verified
              ? 'bg-green-500 border-green-500 shadow-[0_0_14px_rgba(34,197,94,0.35)]'
              : checking
              ? 'border-primary/60 bg-primary/8'
              : 'border-muted-foreground/40 bg-background hover:border-primary hover:shadow-[0_0_8px_rgba(59,130,246,0.2)] cursor-pointer'
          }`}
        >
          <AnimatePresence mode="wait">
            {checking ? (
              <motion.div
                key="spinner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"
              />
            ) : verified ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              >
                <Check size={12} className="text-white" strokeWidth={3.5} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.button>

        <span className={`text-sm font-semibold transition-colors duration-300 ${verified ? 'text-green-400' : 'text-foreground'}`}>
          {checking ? 'Verifying...' : verified ? 'Verified ✓' : "I'm not a robot"}
        </span>
      </div>

      {/* Right: reCAPTCHA brand */}
      <div className="flex flex-col items-center gap-0.5 opacity-40 flex-shrink-0 ml-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4285f4 0%, #34a853 60%, #fbbc05 100%)' }}
        >
          <span className="text-white font-black" style={{ fontSize: 9, letterSpacing: '-0.5px' }}>rC</span>
        </div>
        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">reCAPTCHA</span>
        <span className="text-[7px] text-muted-foreground/60">Privacy · Terms</span>
      </div>
    </div>
  );
}
