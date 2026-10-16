import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import DynamicButton from '@/components/DynamicButton';
import { DEFAULT_UI_BUTTONS, DEFAULT_UI_HERO } from '@/types';

function TickerWord({ word, delay }: { word: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block mr-2.5"
    >
      {word}
    </motion.span>
  );
}

function handleNav(href: string, navigate: ReturnType<typeof useNavigate>) {
  if (!href) return;
  if (href.startsWith('#')) {
    const el = document.getElementById(href.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.location.hash = href;
  } else if (href.startsWith('http')) {
    window.open(href, '_blank', 'noopener,noreferrer');
  } else {
    navigate(href);
  }
}

export default function HeroSection() {
  const { settings } = useAppContext();
  const navigate = useNavigate();

  const heroConfig = settings?.uiHero ?? DEFAULT_UI_HERO;
  const words  = heroConfig.headlineLine1.split(/\s+/).filter(Boolean);
  const words2 = heroConfig.headlineLine2.split(/\s+/).filter(Boolean);
  const trustPills = heroConfig.trustPills?.length ? heroConfig.trustPills : DEFAULT_UI_HERO.trustPills;

  // ── God-Mode button configs ─────────────────────────────────────────────────
  const heroCta = settings?.uiButtons?.find(b => b.id === 'hero-cta')
    ?? DEFAULT_UI_BUTTONS.find(b => b.id === 'hero-cta')!;
  const trackCta = settings?.uiButtons?.find(b => b.id === 'lead-track-cta')
    ?? DEFAULT_UI_BUTTONS.find(b => b.id === 'lead-track-cta')!;

  const formEnabled    = settings?.googleFormEnabled ?? false;
  const formLabel      = settings?.googleFormLabel   || 'Apply Now';
  const formUrl        = settings?.googleFormUrl     || '';
  const hasCashbackBtn = formEnabled && Boolean(formUrl);

  const showHero  = heroCta.enabled;
  const showTrack = trackCta.enabled;

  return (
    <section className="relative z-10 pt-20 md:pt-28 pb-6 md:pb-8 px-5 md:px-[5%] text-center overflow-hidden">
      {/* Background blobs */}
      <div className="blob w-[65vw] h-[65vw] max-w-[750px] max-h-[750px] absolute -top-[20%] -left-[18%] bg-primary pointer-events-none z-0"
        style={{ opacity: 0.08 }} />
      <div className="blob w-[55vw] h-[55vw] max-w-[600px] max-h-[600px] absolute -bottom-[20%] -right-[15%] bg-blue-400 pointer-events-none z-0"
        style={{ opacity: 0.06 }} />
      <div className="hero-grid absolute inset-0 opacity-40 pointer-events-none" />

      {/* Live badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2.5 bg-primary/10 border border-primary/25 text-primary px-5 py-2 rounded-full text-xs font-bold mb-5 shadow-sm"
      >
        <span className="relative flex">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        {heroConfig.badgeText || DEFAULT_UI_HERO.badgeText}
      </motion.div>

      {/* Animated Headline */}
      <h1 className="font-syne font-black text-[2.15rem] md:text-6xl leading-[1.05] tracking-tight mb-3 md:mb-4">
        <div className="text-foreground">
          {words.map((w, i) => <TickerWord key={w} word={w} delay={0.15 + i * 0.07} />)}
        </div>
        <div className="gradient-text">
          {words2.map((w, i) => <TickerWord key={w} word={w} delay={0.38 + i * 0.08} />)}
        </div>
      </h1>

      {/* Sub-headline */}
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
        className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto mb-6 md:mb-8 font-satoshi leading-relaxed"
      >
        <span className="hidden md:inline">
          {heroConfig.subHeadline || DEFAULT_UI_HERO.subHeadline}
        </span>
        <span className="md:hidden">
          {heroConfig.subHeadlineMobile || DEFAULT_UI_HERO.subHeadlineMobile}
        </span>
      </motion.p>

      {/* ── CTAs — single horizontal row, collapses cleanly when all hidden ── */}
      {(showHero || showTrack || hasCashbackBtn) && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`flex items-stretch justify-center gap-2 md:gap-3 mb-6 md:mb-8 mx-auto ${
            [showHero, showTrack, hasCashbackBtn].filter(Boolean).length === 1
              ? 'max-w-[220px] md:max-w-xs'
              : hasCashbackBtn ? 'max-w-sm md:max-w-none' : 'max-w-xs md:max-w-none'
          }`}
        >
          {/* Button 1 — God-Mode hero CTA */}
          {showHero && (
            <DynamicButton
              config={heroCta}
              noAlign
              onClick={() => handleNav(heroCta.href || '#offers', navigate)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5"
            />
          )}

          {/* Button 2 — God-Mode track lead CTA */}
          {showTrack && (
            <DynamicButton
              config={trackCta}
              noAlign
              onClick={() => handleNav(trackCta.href || '/user-lead-track', navigate)}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5"
            />
          )}

          {/* Button 3 — Custom Google Form (settings-driven, not god-mode) */}
          {hasCashbackBtn && (
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 md:gap-2 font-syne font-black text-xs md:text-sm px-3 md:px-7 py-3.5 md:py-4 rounded-2xl md:rounded-full border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all backdrop-blur-sm"
            >
              📝 <span className="truncate max-w-[70px] md:max-w-none">{formLabel}</span>
            </a>
          )}
        </motion.div>
      )}

      {/* ── Trust pills ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.82, ease: [0.22, 1, 0.36, 1] }}
        className={`grid gap-2 max-w-sm mx-auto ${trustPills.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}
      >
        {trustPills.map((t, i) => (
          <motion.span
            key={t.label}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.86 + i * 0.05, duration: 0.35 }}
            className="flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold px-2 py-3 rounded-2xl bg-card/80 border border-border/60 text-muted-foreground text-center backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default"
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span className="leading-tight">{t.label}</span>
          </motion.span>
        ))}
      </motion.div>
    </section>
  );
}
