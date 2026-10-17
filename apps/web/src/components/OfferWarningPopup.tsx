import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert } from 'lucide-react';
import type { Offer } from '@/types';

interface Props {
  offer: Offer;
  onConfirm: () => void;
  onClose: () => void;
}

export default function OfferWarningPopup({ offer, onConfirm, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.78, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden"
          style={{
            border: '2px solid rgba(163,230,53,0.5)',
            boxShadow: '0 0 0 4px rgba(163,230,53,0.15), 0 0 60px rgba(163,230,53,0.25), 0 32px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all"
          >
            <X size={13} />
          </button>

          {/* Custom Banner */}
          {offer.warningPopupImage ? (
            <div className="relative">
              <img
                src={offer.warningPopupImage}
                alt="Important Notice"
                className="w-full object-cover block"
                style={{ maxHeight: 260 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest text-lime-300 bg-lime-400/15 border border-lime-400/30 px-2.5 py-1 rounded-full">
                    ⚠ Important Notice
                  </span>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="font-syne font-black text-lg text-white leading-tight"
                >
                  Read before continuing
                </motion.p>
              </div>
            </div>
          ) : (
            /* Default warning design */
            <div className="bg-zinc-900 px-6 pt-8 pb-5 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-lime-400/10 border-2 border-lime-400/30 flex items-center justify-center mx-auto mb-4"
              >
                <ShieldAlert size={36} className="text-lime-400" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="font-syne font-black text-xl text-white"
              >
                ⚠ Important Notice
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-zinc-400 mt-2 leading-relaxed"
              >
                Please read the instructions carefully before proceeding to this offer.
              </motion.p>
            </div>
          )}

          {/* Action area */}
          <div className="bg-zinc-950 px-5 py-5 space-y-3 border-t border-zinc-800">
            {/* Offer identity */}
            <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                {offer.logoUrl
                  ? <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  : offer.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-syne font-black text-sm text-white truncate">{offer.name}</p>
                <p className="text-xs text-zinc-500">₹{offer.payout} cashback offer</p>
              </div>
            </div>

            <motion.button
              onClick={onConfirm}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-syne font-black text-base text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
              }}
            >
              ✅ I Understand — Continue →
            </motion.button>

            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-semibold"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
