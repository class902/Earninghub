import { appPath } from '@/lib/appUrl';
import { useAppContext } from '@/contexts/AppContext';

function getSocialBg(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'linear-gradient(135deg, #0088cc, #006699)';
  if (n.includes('whatsapp')) return 'linear-gradient(135deg, #25d366, #128c7e)';
  if (n.includes('instagram')) return 'linear-gradient(135deg, #f77737, #e1306c, #405de6)';
  if (n.includes('facebook')) return 'linear-gradient(135deg, #1877f2, #0a5dc2)';
  if (n.includes('twitter') || n.includes('x.com') || n === 'x') return 'linear-gradient(135deg, #333, #000)';
  if (n.includes('youtube')) return 'linear-gradient(135deg, #ff0000, #cc0000)';
  if (n.includes('discord')) return 'linear-gradient(135deg, #5865f2, #4752c4)';
  if (n.includes('linkedin')) return 'linear-gradient(135deg, #0077b5, #005885)';
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
  if (n.includes('linkedin')) return '💼';
  if (n.includes('support') || n.includes('help')) return '🎧';
  if (n.includes('email') || n.includes('mail')) return '📧';
  return '🔗';
}

function getSocialCta(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'Follow / Join →';
  if (n.includes('whatsapp')) return 'Contact Us →';
  if (n.includes('support') || n.includes('help')) return 'Get Help →';
  if (n.includes('youtube')) return 'Subscribe →';
  if (n.includes('instagram') || n.includes('facebook') || n.includes('twitter') || n.includes('linkedin')) return 'Follow Us →';
  if (n.includes('discord')) return 'Join Server →';
  return 'Visit →';
}

export default function SiteFooter() {
  const { settings } = useAppContext();
  const webLogoUrl = settings?.uiBrand?.webLogoUrl || settings?.webLogoUrl;
  const socialLinks = settings?.socialLinks || [];
  const siteName = settings?.uiBrand?.siteName || settings?.siteName || 'EarningHub';
  const referralEnabled = settings?.referralEnabled ?? false;

  // Find a support-like link for the footer "Contact Support" entry
  const supportLink = socialLinks.find(s => /help|support/i.test(s.name)) || socialLinks.find(s => /telegram/i.test(s.name));

  const FOOTER_COLS = [
    {
      title: 'Platform',
      links: [
        ['/#offers', '🎯 Live Offers'],
        ['/#cashback-forms', '💰 Cashback Forms'],
        ...(referralEnabled ? [['/#refer', '🤝 Refer & Earn'] as [string, string]] : []),
      ],
    },
    {
      title: 'Support',
      links: [
        ['/user-lead-track', '🔍 Track Cashback'],
        ...(supportLink ? [[supportLink.url, '📞 Contact Support'] as [string, string]] : []),
      ],
    },
  ];

  const HOW_IT_WORKS = [
    { step: '01', icon: '🎯', title: 'Pick an Offer', desc: 'Browse verified cashback deals — Demat accounts, app installs, investments and more.' },
    { step: '02', icon: '✅', title: 'Complete the Task', desc: 'Follow the simple steps shown — open an account, install an app, or make a transaction.' },
    { step: '03', icon: '💸', title: 'Get Paid to UPI', desc: 'Submit your UPI ID, we verify your completion and transfer the cashback directly to you.' },
  ];

  const TRUST_BADGES = [
    { icon: '🔐', label: 'SSL Secured' },
    { icon: '✅', label: 'Verified Offers' },
    { icon: '👥', label: '50K+ Earners' },
    { icon: '⚡', label: '24hr Payouts' },
    { icon: '🇮🇳', label: 'Made in India' },
  ];

  return (
    <footer className="relative z-10 border-t border-border px-5 md:px-[5%] pt-16 pb-8 bg-card/80">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* ── How It Works ── */}
      <div className="max-w-6xl mx-auto mb-14">
        <div className="text-center mb-8">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">Simple Process</span>
          <h3 className="font-syne font-black text-2xl md:text-3xl text-foreground">How It Works</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Three easy steps to earn real cashback, no investment required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((item, i) => (
            <div key={i} className="relative flex items-start gap-4 p-5 bg-background border border-border rounded-2xl hover:border-primary/30 transition-colors group">
              <span className="absolute -top-3 left-5 text-[10px] font-black text-primary bg-card border border-primary/30 px-2.5 py-0.5 rounded-full">{item.step}</span>
              <span className="text-3xl flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">{item.icon}</span>
              <div>
                <p className="font-syne font-black text-foreground text-sm mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {TRUST_BADGES.map(b => (
            <span key={b.label} className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-background border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
              <span>{b.icon}</span>{b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-border mb-14" />

      {/* ── Social Media — vertical stacked layout ── */}
      {socialLinks.length > 0 && (
        <div className="max-w-6xl mx-auto mb-10">
          <div className="text-center mb-5">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">🔗 Social Media</span>
          </div>
          <div className="flex flex-col gap-3 max-w-xl mx-auto">
            {socialLinks.map(link => {
              const cta = getSocialCta(link.name);
              return (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:border-primary/40 transition-all group w-full"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {link.iconUrl ? (
                    <img src={link.iconUrl} alt={link.name}
                      className="w-11 h-11 rounded-full object-cover group-hover:scale-110 transition-transform flex-shrink-0"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform text-white"
                      style={{ background: getSocialBg(link.name) }}>
                      {getSocialIcon(link.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-syne font-black text-sm text-foreground">{link.name}</p>
                    <p className="text-xs text-muted-foreground">{cta}</p>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">→</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12 max-w-6xl mx-auto">
        {/* Brand col */}
        <div className="col-span-2 md:col-span-1">
          {webLogoUrl ? (
            <img src={webLogoUrl} alt={siteName} className="h-10 w-auto object-contain mb-4"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-xl mb-4 shadow-lg blue-glow-sm">
              💰
            </div>
          )}
          <div className="font-syne font-black text-lg text-foreground mb-2.5 leading-tight">
            {siteName}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">
            India's most trusted online earning platform. Transparent payouts, zero investment required.
          </p>
          {/* Small social icons */}
          <div className="flex gap-2 flex-wrap">
            {socialLinks.map(sl => (
              <a key={sl.id} href={sl.url} target="_blank" rel="noreferrer"
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:scale-110 transition-all overflow-hidden text-white"
                style={{ background: getSocialBg(sl.name) }}>
                {sl.iconUrl ? (
                  <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : <span className="text-sm">{getSocialIcon(sl.name)}</span>}
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLS.map(col => (
          <div key={col.title}>
            <h4 className="font-syne font-black text-foreground mb-4 text-xs uppercase tracking-widest">{col.title}</h4>
            <ul className="space-y-3">
              {col.links.map(([href, label]) => (
                <li key={label}>
                  <a href={appPath(href)} className="text-muted-foreground text-sm hover:text-primary transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3 max-w-6xl mx-auto">
        <p className="text-muted-foreground text-sm">© 2026 {siteName}. All rights reserved.</p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">✓ Platform Verified</span>
          <p className="text-muted-foreground text-xs">🔒 100% Secure Platform</p>
        </div>
      </div>
    </footer>
  );
}
