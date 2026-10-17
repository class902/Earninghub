import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Poster } from '@/types';
import PosterLightbox from '@/components/PosterLightbox';

interface Props { posters: Poster[] }

const PARTICLES = [
  { top: '12%', left: '-4%', delay: 0,   size: 6, color: 'bg-gold' },
  { top: '72%', left: '-6%', delay: 0.8, size: 4, color: 'bg-fire' },
  { top: '18%', right: '-4%', delay: 1.2, size: 5, color: 'bg-gold' },
  { top: '78%', right: '-5%', delay: 0.4, size: 6, color: 'bg-primary' },
  { top: '50%', left: '-7%', delay: 1.6, size: 3, color: 'bg-fire' },
  { top: '40%', right: '-7%', delay: 0.6, size: 4, color: 'bg-primary' },
];

export default function HomeBanner({ posters }: Props) {
  // Strict: ONLY render if poster has BOTH a real imageUrl AND a real non-internal title
  // Backend already filters for isActive posters; filter out blank/internal records here
  const active = posters.filter(
    p => p.imageUrl?.trim() && p.title?.trim() && !p.title.startsWith('__'),
  );
  const [idx, setIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), 5000);
    return () => clearInterval(t);
  }, [active.length]);

  // ⬇️ Strict conditional — return null if either field is missing
  if (active.length === 0) return null;

  const current = active[idx];

  return (
    <div className="relative z-10 px-5 md:px-[5%] pt-6 pb-2">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        {/* Floating particles — CSS animations */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${p.color} pointer-events-none animate-pulse`}
            style={{ top: p.top, [p.left ? 'left' : 'right']: p.left || p.right, width: p.size, height: p.size, opacity: 0.6, animationDelay: `${p.delay}s`, animationDuration: `${3 + i * 0.4}s` }}
          />
        ))}

        {/* Label row */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-2.5 h-2.5 rounded-full bg-gold inline-block shadow-[0_0_8px_rgba(240,180,41,0.8)] animate-pulse"
          />
          <span className="font-syne font-black text-foreground text-lg">📢 Latest News</span>
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            className="text-xs font-black px-2.5 py-0.5 rounded-full border text-gold border-gold/30 bg-gold/10"
          >
            {active.length} update{active.length > 1 ? 's' : ''}
          </motion.span>
        </div>

        {/* Banner card */}
        <motion.div
          className="relative rounded-2xl overflow-hidden border border-gold/20 cursor-pointer"
          style={{
            maxHeight: 380,
            boxShadow: '0 0 60px rgba(240,180,41,0.12), 0 24px 48px rgba(0,0,0,0.35)',
          }}
          whileHover={{ boxShadow: '0 0 80px rgba(240,180,41,0.2), 0 32px 64px rgba(0,0,0,0.4)' }}
          transition={{ duration: 0.4 }}
          onClick={() => setLightboxOpen(true)}
        >
          {/* Animated gradient top border */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px] z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, #f0b429, #ff5722, #f0b429)' }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />

          <AnimatePresence mode="wait">
            <motion.img
              key={current.id}
              src={current.imageUrl}
              alt={current.title}
              initial={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full object-cover"
              style={{ maxHeight: 380 }}
            />
          </AnimatePresence>

          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-5 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.4 }}
              >
                <motion.span
                  className="inline-block text-[10px] font-black uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-full mb-2 backdrop-blur-sm"
                >
                  🔴 LIVE UPDATE
                </motion.span>
                <p className="text-white font-syne font-black text-lg md:text-xl leading-tight">
                  {current.title}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot navigation */}
          {active.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
              {active.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => setIdx(i)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-5 bg-gold shadow-[0_0_6px_rgba(240,180,41,0.8)]' : 'w-2 bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      <PosterLightbox src={current.imageUrl} alt={current.title} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </div>
  );
}
