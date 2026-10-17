import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAKE_NAMES = [
  'Arjun K.', 'Priya S.', 'Rahul M.', 'Sneha V.', 'Vikram P.',
  'Divya R.', 'Amit T.', 'Pooja N.', 'Ravi C.', 'Neha G.',
  'Suresh L.', 'Anjali D.', 'Kiran B.', 'Meera J.', 'Rohan K.',
  'Sonal P.', 'Aakash R.', 'Kavya M.', 'Deepak S.', 'Isha V.',
];

interface Entry {
  id: number;
  name: string;
  amount: number;
  offer: string;
  time: string;
}

interface Props {
  offerPayouts?: { name: string; payout: number }[];
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + '…' : s; }

export default function PayoutTicker({ offerPayouts = [] }: Props) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!offerPayouts.length) return;

    let idx = 0;
    const nameIdx = Math.floor(Math.random() * FAKE_NAMES.length);

    function showNext() {
      const offer = offerPayouts[idx % offerPayouts.length];
      const nameI = (nameIdx + idx) % FAKE_NAMES.length;
      const mins = 1 + Math.floor(Math.random() * 58);
      setEntry({
        id: idx,
        name: FAKE_NAMES[nameI],
        amount: offer.payout,
        offer: truncate(offer.name, 20),
        time: `${mins}m ago`,
      });
      setKey(k => k + 1);
      idx++;
    }

    const initial = setTimeout(showNext, 5000);
    const interval = setInterval(showNext, 5000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [offerPayouts]);

  if (!entry) return null;

  return (
    <div className="fixed bottom-[52px] md:bottom-6 right-3 z-30 pointer-events-none" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 max-w-[210px] shadow-xl pointer-events-auto bg-card/95 backdrop-blur-xl"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-xs flex-shrink-0">
            💰
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black leading-tight">
              <span className="text-emerald-400">⚡ {entry.name}</span>{' '}
              <span className="text-foreground">got </span>
              <span className="text-primary font-black">₹{entry.amount}</span>
            </p>
            <p className="text-[8px] text-muted-foreground mt-0.5 truncate">{entry.offer} · {entry.time}</p>
          </div>
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
