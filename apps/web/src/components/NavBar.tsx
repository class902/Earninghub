import { appPath } from '@/lib/appUrl';
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';
import DynamicButton from '@/components/DynamicButton';
import { DEFAULT_UI_BUTTONS } from '@/types';

const BASE_NAV_LINKS = [
  { href: '#offers', label: 'Live Offers', icon: '🎯' },
  { href: '#cashback-forms', label: 'Cashback Forms', icon: '💰' },
];

function getSocialBg(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'linear-gradient(135deg, #0088cc, #006699)';
  if (n.includes('whatsapp')) return 'linear-gradient(135deg, #25d366, #128c7e)';
  if (n.includes('instagram')) return 'linear-gradient(135deg, #f77737, #e1306c, #405de6)';
  if (n.includes('facebook')) return 'linear-gradient(135deg, #1877f2, #0a5dc2)';
  if (n.includes('twitter') || n.includes('x.com') || n === 'x') return 'linear-gradient(135deg, #333, #000)';
  if (n.includes('youtube')) return 'linear-gradient(135deg, #ff0000, #cc0000)';
  if (n.includes('discord')) return 'linear-gradient(135deg, #5865f2, #4752c4)';
  if (n.includes('support') || n.includes('help')) return 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
  if (n.includes('email') || n.includes('mail')) return 'linear-gradient(135deg, #ea4335, #c5221f)';
  return 'linear-gradient(135deg, hsl(var(--primary)), #f0b429)';
}

function getSocialIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return '✈';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('instagram')) return '📷';
  if (n.includes('facebook')) return '👤';
  if (n.includes('twitter') || n.includes('x.com') || n === 'x') return '𝕏';
  if (n.includes('youtube')) return '▶';
  if (n.includes('discord')) return '🎮';
  if (n.includes('support') || n.includes('help')) return '🎧';
  if (n.includes('email') || n.includes('mail')) return '📧';
  return '🔗';
}

const drawerVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { settings } = useAppContext();
  const navigate = useNavigate();
  const webLogoUrl = settings?.uiBrand?.webLogoUrl || settings?.webLogoUrl;
  const siteName = settings?.uiBrand?.siteName || settings?.siteName || 'EarningHub';
  const formEnabled = settings?.googleFormEnabled ?? false;
  const formLabel = settings?.googleFormLabel || 'Apply Now';
  const formUrl = settings?.googleFormUrl || '';
  const referralEnabled = settings?.referralEnabled ?? false;
  const socialLinks = settings?.socialLinks || [];

  const navEarnCta = settings?.uiButtons?.find(b => b.id === 'nav-earn-cta')
    ?? DEFAULT_UI_BUTTONS.find(b => b.id === 'nav-earn-cta')!;

  const NAV_LINKS = [
    ...BASE_NAV_LINKS,
    ...(referralEnabled ? [{ href: '#refer', label: 'Refer & Earn', icon: '🤝' }] : []),
  ];

  const toggleMenu = useCallback(() => setMenuOpen(o => !o), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  function handleNavCta() {
    const href = navEarnCta.href || '#offers';
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(href);
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="flex items-center justify-between px-5 md:px-10 py-3.5">
        {/* Logo + Brand Name */}
        <a href={appPath('/')} className="flex items-center gap-3 group flex-shrink min-w-0">
          {webLogoUrl && !logoError ? (
            <img
              src={webLogoUrl}
              alt={siteName}
              className="h-10 w-auto max-w-[48px] object-contain group-hover:scale-105 transition-transform duration-200 flex-shrink-0"
              width={48}
              height={40}
              loading="eager"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg bg-gradient-to-br from-primary to-blue-400 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <span>💰</span>
            </div>
          )}
          <span className="font-syne font-black text-base md:text-lg text-foreground truncate max-w-[180px] md:max-w-[260px]">
            {siteName}
          </span>
        </a>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-6 list-none">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href} className="text-muted-foreground text-sm font-semibold hover:text-primary transition-colors">
                {label}
              </a>
            </li>
          ))}
          <li>
            <Link to="/user-lead-track" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
              <Search size={14} />Track Lead
            </Link>
          </li>
        </ul>

        {/* Right side: Hamburger + CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMenu}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-95 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <motion.div
              initial={false}
              animate={{ rotate: menuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.div>
          </button>
          {navEarnCta.enabled && (
            <DynamicButton
              config={navEarnCta}
              noAlign
              onClick={handleNavCta}
              className="hidden md:flex items-center justify-center gap-1.5"
            />
          )}
          {/* Desktop hamburger for social links */}
          <button
            onClick={toggleMenu}
            className="hidden md:flex p-2.5 rounded-xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-95"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Navigation drawer — AnimatePresence for smooth mount/unmount */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-5 py-4 space-y-1 bg-background/98 backdrop-blur-xl">
              {NAV_LINKS.map(({ href, label, icon }) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground font-semibold text-sm hover:bg-primary/10 hover:text-primary active:bg-primary/15 transition-all"
                >
                  <span>{icon}</span><span>{label}</span>
                </a>
              ))}
              <Link to="/user-lead-track" onClick={closeMenu}
                className="flex w-full items-center gap-3 py-3 px-4 rounded-xl text-muted-foreground font-semibold text-sm hover:bg-primary/10 hover:text-primary active:bg-primary/15 transition-all"
              >
                <Search size={15} /><span>Track My Lead</span>
              </Link>
              {formEnabled && formUrl && (
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl text-primary font-semibold text-sm hover:bg-primary/10 transition-all border border-primary/20"
                >
                  <span>📝</span><span>{formLabel}</span>
                </a>
              )}

              {/* ── Social Media / Support ── */}
              {socialLinks.length > 0 && (
                <>
                  <div className="pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Social Media</span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {socialLinks.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={closeMenu}
                        className="flex items-center gap-2.5 py-3 px-3 rounded-xl border border-border/60 hover:border-primary/40 active:bg-primary/10 transition-all group"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        {link.iconUrl ? (
                          <img src={link.iconUrl} alt={link.name}
                            className="w-8 h-8 rounded-lg object-cover group-hover:scale-110 transition-transform duration-200 flex-shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200 text-white"
                            style={{ background: getSocialBg(link.name) }}>
                            {getSocialIcon(link.name)}
                          </div>
                        )}
                        <span className="font-syne font-black text-xs text-foreground truncate">{link.name}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* CTA */}
              <div className="pt-2">
                <a
                  href="#offers"
                  onClick={closeMenu}
                  className="flex items-center justify-center py-3.5 rounded-xl font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 shadow-lg blue-glow-sm active:scale-[0.98] transition-transform"
                >
                  🔥 Start Earning Now →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
