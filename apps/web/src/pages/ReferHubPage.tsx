import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, Sparkles, Users, Gift, Copy, Check, BarChart2, Link2, Search, ArrowRight } from 'lucide-react';
import { getReferralOffers, GetReferralOffersOutputType, getMyReferralLinks, GetMyReferralLinksOutputType } from '@/lib/api';
import { useAppContext } from '@/contexts/AppContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type ReferralOffer = GetReferralOffersOutputType['offers'][0];
type MyLink = GetMyReferralLinksOutputType['links'][0];

export default function ReferHubPage() {
  const { settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<ReferralOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<ReferralOffer | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // My existing links
  const [upiInput, setUpiInput] = useState('');
  const [myLinks, setMyLinks] = useState<MyLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [showMyLinks, setShowMyLinks] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    getReferralOffers({})
      .then(r => setOffers(r.offers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load saved UPI from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eh_referrer_upi');
    if (saved) {
      setUpiInput(saved);
      fetchMyLinks(saved);
    }
  }, []);

  async function fetchMyLinks(upi?: string) {
    const u = (upi || upiInput).trim();
    if (!u || u.length < 3) return;
    setLoadingLinks(true);
    try {
      const res = await getMyReferralLinks({ referrerUpi: u });
      setMyLinks(res.links);
      setShowMyLinks(true);
      localStorage.setItem('eh_referrer_upi', u);
    } catch {} finally { setLoadingLinks(false); }
  }

  function handleGenerate() {
    if (!selectedOffer) return;
    const url = `${appOrigin()}/refer-generate/${selectedOffer.slug}`;
    window.open(url, '_blank', 'width=480,height=720,scrollbars=yes');
  }

  function copyLink(link: MyLink) {
    const url = `${appOrigin()}/${link.offerSlug}.ref/${link.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(link.referralCode);
      toast.success('Link copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  function openTracker(link: MyLink) {
    const url = `${appOrigin()}/${link.offerSlug}.track/${link.referralCode}`;
    window.open(url, '_blank');
  }

  const totalEarnings = myLinks.reduce((s, l) => s + l.totalEarnings, 0);
  const totalLeads = myLinks.reduce((s, l) => s + l.leadCount, 0);
  const totalClicks = myLinks.reduce((s, l) => s + l.clickCount, 0);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full blur-3xl opacity-[0.04] pointer-events-none top-[-15%] right-[-10%]" style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full blur-3xl opacity-[0.04] pointer-events-none bottom-[-10%] left-[-10%]" style={{ background: '#f0b429' }} />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2">
            ← Back to {siteName}
          </Link>
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(240,180,41,0.15))', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Sparkles className="text-primary" size={36} />
          </div>
          <h1 className="font-syne font-black text-3xl text-foreground">Referral Hub</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Earn cashback by referring friends! Select an offer, generate your unique link, and earn every time someone completes it.
          </p>
        </motion.div>

        {/* My Links Section — check existing links by UPI */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">🔍 Find My Existing Links</p>
          <div className="flex gap-2">
            <input
              value={upiInput}
              onChange={e => setUpiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMyLinks()}
              placeholder="Enter your UPI ID"
              className="flex-1 px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors"
            />
            <button onClick={() => fetchMyLinks()} disabled={loadingLinks || upiInput.trim().length < 3}
              className="px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm font-black hover:bg-primary/20 transition-all disabled:opacity-40">
              {loadingLinks ? '…' : <Search size={16} />}
            </button>
          </div>

          <AnimatePresence>
            {showMyLinks && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {myLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No existing links found for this UPI. Generate one below! 👇</p>
                ) : (
                  <div className="space-y-3">
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <p className="font-syne font-black text-sm text-emerald-400">₹{totalEarnings}</p>
                        <p className="text-[9px] text-muted-foreground">Earned</p>
                      </div>
                      <div className="text-center p-2 bg-primary/5 border border-primary/20 rounded-xl">
                        <p className="font-syne font-black text-sm text-primary">{totalLeads}</p>
                        <p className="text-[9px] text-muted-foreground">Leads</p>
                      </div>
                      <div className="text-center p-2 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <p className="font-syne font-black text-sm text-amber-400">{totalClicks}</p>
                        <p className="text-[9px] text-muted-foreground">Clicks</p>
                      </div>
                    </div>

                    {/* Links list */}
                    <div className="divide-y divide-border/40 rounded-xl border border-border overflow-hidden">
                      {myLinks.map(link => (
                        <div key={link.id} className="p-3 bg-background/50 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-foreground truncate">{link.offerName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                                link.linkStatus === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-muted/10 border-border text-muted-foreground'
                              }`}>{link.linkStatus}</span>
                              <span className="text-[9px] text-muted-foreground">{link.leadCount} leads · {link.clickCount} clicks</span>
                              {link.totalEarnings > 0 && <span className="text-[9px] font-black text-emerald-400">₹{link.totalEarnings}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => copyLink(link)}
                              className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                              {copiedCode === link.referralCode ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <button onClick={() => openTracker(link)}
                              className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all">
                              <BarChart2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-4">💡 How it works</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Gift size={20} />, step: '1', label: 'Pick Offer', desc: 'Choose from active referral offers' },
              { icon: <Users size={20} />, step: '2', label: 'Share Link', desc: 'Share your unique link with friends' },
              { icon: <Sparkles size={20} />, step: '3', label: 'Earn', desc: 'Get paid when friends complete the offer' },
            ].map(s => (
              <div key={s.step} className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">{s.icon}</div>
                <p className="text-xs font-black text-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Offer Selection */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">🎯 Select an Offer</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-2xl animate-pulse" />)}
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-10 bg-card border border-border rounded-2xl">
              <p className="text-3xl mb-3">😔</p>
              <p className="text-sm font-bold text-foreground">No Referral Offers Available</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later — new offers are added frequently!</p>
            </div>
          ) : (
            <>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all group"
              >
                {selectedOffer ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedOffer.logoUrl ? (
                        <img src={selectedOffer.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-xl">{selectedOffer.emoji}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-syne font-black text-sm text-foreground">{selectedOffer.name}</p>
                      <p className="text-[10px] text-amber-400 font-bold">Earn up to ₹{selectedOffer.payout}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Choose an offer to refer…</span>
                )}
                <ChevronDown size={18} className={`text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                  >
                    <div className="max-h-[320px] overflow-y-auto">
                      {offers.map((offer, idx) => {
                        const hasExisting = myLinks.some(l => l.offerSlug === offer.slug && l.linkStatus === 'Active');
                        return (
                          <button
                            key={offer.id}
                            onClick={() => { setSelectedOffer(offer); setDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:bg-primary/5 ${
                              selectedOffer?.id === offer.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                            } ${idx < offers.length - 1 ? 'border-b border-border/40' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {offer.logoUrl ? (
                                <img src={offer.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span className="text-xl">{offer.emoji}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-syne font-black text-sm text-foreground truncate">{offer.name}</p>
                                {hasExisting && (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex-shrink-0">ACTIVE</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-amber-400">₹{offer.payout}</span>
                                <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{offer.category}</span>
                              </div>
                            </div>
                            {selectedOffer?.id === offer.id && (
                              <span className="text-primary text-sm flex-shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* Generate Button */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button
            onClick={handleGenerate}
            disabled={!selectedOffer}
            className="w-full flex items-center justify-center gap-3 py-4 font-syne font-black text-base rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-black relative overflow-hidden"
            style={{
              background: selectedOffer ? 'linear-gradient(135deg, #f0b429, #ff5722)' : undefined,
              boxShadow: selectedOffer ? '0 8px 32px rgba(240,180,41,0.35)' : undefined,
            }}
          >
            {!selectedOffer ? (
              <span className="text-muted-foreground">Select an offer first</span>
            ) : (
              <>
                <ExternalLink size={18} />
                Generate Referral Link
                <ArrowRight size={16} className="opacity-70" />
              </>
            )}
          </button>
          {selectedOffer && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              A new window will open where you can fill your details and customize your payout split
            </p>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center space-y-3 pt-4 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground">
            🔒 Your referral links are permanent and unique to you. Share them anywhere!
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border text-muted-foreground rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all">
            🎯 Browse All Offers
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
