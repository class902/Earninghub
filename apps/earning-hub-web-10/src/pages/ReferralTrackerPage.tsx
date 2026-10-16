import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Share2, MessageCircle, ExternalLink, BarChart2, Link2, Home, Clock, Users, ChevronDown, RefreshCw, TrendingUp, Filter, ArrowUpRight, Zap } from 'lucide-react';
import { getReferralLeads, GetReferralLeadsOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/AppContext';

type TrackerData = GetReferralLeadsOutputType;
type MaskedLead = TrackerData['leads'][0];

interface Props {
  overrideCode?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'In Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  'Cashback Sent': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Missing: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const ALL_STATUSES = ['All', 'Pending', 'In Review', 'Approved', 'Cashback Sent', 'Paid', 'Missing'];

export default function ReferralTrackerPage({ overrideCode }: Props = {}) {
  const { code: routeCode } = useParams<{ code: string }>();
  const code = overrideCode || routeCode;
  const { settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';
  const telegramLink = settings?.telegramLink || '';
  const socialLinks = settings?.socialLinks || [];

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrackerData | null>(null);
  const [copied, setCopied] = useState<'link' | 'tracker' | null>(null);
  const [showLeads, setShowLeads] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!code) { setLoading(false); return; }
    if (!silent) setRefreshing(true);
    try {
      const d = await getReferralLeads({ code });
      setData(d);
      setLastRefresh(new Date());
    } catch {
      if (!silent) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [code]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!code || !data?.valid) return;
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [code, data?.valid, fetchData]);

  function copyText(text: string, type: 'link' | 'tracker') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      toast.success(type === 'link' ? 'Referral link copied! 🎉' : 'Tracker link copied!');
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleShare(text: string, url: string) {
    if (navigator.share) {
      try { await navigator.share({ title: `${siteName} Referral`, text, url }); return; } catch {}
    }
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  }

  const appUrl = typeof window !== 'undefined' ? appOrigin() : '';
  const offerSlug = data?.link?.offerSlug || '';
  const referralLink = code ? `${appUrl}/${offerSlug}.ref/${code}` : '';
  const trackerLink = code ? `${appUrl}/${offerSlug}.track/${code}` : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl animate-pulse">📊</div>
          <p className="font-syne font-black text-muted-foreground text-sm">Loading your referral dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data?.valid || !data.link) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl border border-border p-8 text-center bg-card shadow-xl">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="font-syne font-black text-xl text-foreground mb-2">Link Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">{data?.reason || "This referral tracker link doesn't exist or may have been removed."}</p>
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-sm font-black hover:bg-primary/20 transition-all">
            <Home size={14} /> Back to {siteName}
          </Link>
        </motion.div>
      </div>
    );
  }

  const { link, offer, leads, totalEarnings, pendingEarnings } = data;
  const youGet = link.referrerCut || Math.round((Number(link.referrerSplit) / 100) * (offer?.payout || 0));
  const friendGets = link.userCut || ((offer?.payout || 0) - youGet);

  const isRevoked = link.linkStatus === 'Revoked';
  const isOfferExpired = offer?.expiresAt ? new Date(offer.expiresAt) < new Date() : false;
  const isOfferInactive = offer?.status?.toLowerCase() !== 'active';

  // Computed stats
  const conversionRate = link.clickCount > 0 ? ((leads.length / link.clickCount) * 100).toFixed(1) : '0';
  const approvedLeads = leads.filter(l => ['Approved', 'Cashback Sent', 'Paid'].includes(l.status)).length;
  const pendingLeads = leads.filter(l => ['Pending', 'In Review'].includes(l.status)).length;
  const filteredLeads = statusFilter === 'All' ? leads : leads.filter(l => l.status === statusFilter);

  function shareWhatsApp() {
    const msg = `🎁 Join ${siteName} and earn cashback!\n💰 You get ₹${friendGets} when you complete the offer!\n🔗 ${referralLink}\n✨ Limited slots!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function shareTelegram() {
    const msg = `🎁 Earn ₹${friendGets} cashback on ${link.offerName}! Use my link: ${referralLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(msg)}`, '_blank');
  }

  function shareTwitter() {
    const msg = `🎁 Earn ₹${friendGets} cashback on ${link.offerName}! ${referralLink}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Header with refresh */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-syne font-black text-2xl text-foreground">📊 Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}
              <span className="text-[9px] ml-1 opacity-60">• auto-refreshes</span>
            </p>
          </div>
          <button onClick={() => fetchData()} disabled={refreshing}
            className={`p-2.5 rounded-xl border border-border bg-card hover:bg-muted/20 transition-all ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw size={16} className="text-muted-foreground" />
          </button>
        </motion.div>

        {/* Status Banner */}
        {(isRevoked || isOfferExpired || isOfferInactive) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{isRevoked ? '🚫' : '⏰'}</span>
            <div>
              <p className="text-sm font-black text-destructive">{isRevoked ? 'This link has been revoked' : 'This offer has ended'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isRevoked ? 'Contact admin to reactivate' : 'Your link is no longer active for new referrals'}</p>
            </div>
          </motion.div>
        )}

        {/* Earnings Hero Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)' }}>
          <div className="p-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {offer?.logoUrl ? <img src={offer.logoUrl} alt={offer?.name} className="w-full h-full object-cover rounded-2xl" /> : <span className="text-2xl">{offer?.emoji}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-syne font-black text-base text-foreground truncate">{offer?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-400">
                    EARN ₹{youGet}/referral
                  </span>
                  {offer?.expiresAt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/20 border border-border rounded-full text-[10px] font-black text-muted-foreground">
                      <Clock size={9} /> {new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Big earnings display */}
            <div className="text-center py-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">TOTAL EARNED</p>
              <p className="font-syne font-black text-4xl text-emerald-400 leading-none">
                {totalEarnings > 0 ? `₹${totalEarnings.toLocaleString('en-IN')}` : '₹0'}
              </p>
              {pendingEarnings > 0 && (
                <p className="text-xs text-amber-400 font-bold mt-1.5">+ ₹{pendingEarnings.toLocaleString('en-IN')} pending</p>
              )}
            </div>
          </div>

          {/* Mini stats bar */}
          <div className="grid grid-cols-4 border-t border-border/40 bg-card/30">
            <MiniStat icon="👆" value={link.clickCount} label="Clicks" />
            <MiniStat icon="👥" value={leads.length} label="Leads" />
            <MiniStat icon="✅" value={approvedLeads} label="Approved" />
            <MiniStat icon="📈" value={`${conversionRate}%`} label="CVR" />
          </div>
        </motion.div>

        {/* Split Cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-0.5">YOU EARN</p>
            <p className="font-syne font-black text-xl text-primary">₹{youGet}</p>
            <p className="text-[10px] text-muted-foreground">per referral</p>
          </div>
          <div className="text-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5">FRIEND GETS</p>
            <p className="font-syne font-black text-xl text-amber-400">₹{friendGets}</p>
            <p className="text-[10px] text-muted-foreground">on completion</p>
          </div>
        </motion.div>

        {/* Conversion Funnel */}
        {leads.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Conversion Funnel</p>
            </div>
            <FunnelBar label="Clicks" value={link.clickCount} max={link.clickCount} color="bg-blue-500" />
            <FunnelBar label="Leads" value={leads.length} max={link.clickCount} color="bg-amber-500" />
            <FunnelBar label="Approved" value={approvedLeads} max={link.clickCount} color="bg-emerald-500" />
          </motion.div>
        )}

        {/* Referred Leads with filters */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowLeads(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <div className="text-left">
                <p className="font-syne font-black text-sm text-foreground">Referred Leads ({leads.length})</p>
                <p className="text-[10px] text-muted-foreground">People who used your link</p>
              </div>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showLeads ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showLeads && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border">
                  {/* Status filter pills */}
                  {leads.length > 0 && (
                    <div className="px-4 py-2.5 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border/40">
                      {ALL_STATUSES.map(s => {
                        const count = s === 'All' ? leads.length : leads.filter(l => l.status === s).length;
                        if (s !== 'All' && count === 0) return null;
                        return (
                          <button key={s} onClick={() => setStatusFilter(s)}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
                              statusFilter === s
                                ? 'bg-primary/15 border-primary/30 text-primary'
                                : 'bg-muted/10 border-border text-muted-foreground hover:border-primary/20'
                            }`}>
                            {s} {count > 0 ? `(${count})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredLeads.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-3xl mb-2">{statusFilter !== 'All' ? '🔍' : '🔗'}</p>
                      <p className="text-sm font-bold text-muted-foreground">
                        {statusFilter !== 'All' ? `No ${statusFilter} leads` : 'No referrals yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusFilter !== 'All' ? 'Try another filter' : 'Share your link to start earning!'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
                      {filteredLeads.map((lead, idx) => (
                        <LeadRow key={idx} lead={lead} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Referral Link + Share */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-emerald-400" />
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Your Referral Link</p>
          </div>
          <div className="bg-background border border-border rounded-xl px-3 py-2.5">
            <p className="text-xs font-mono text-foreground break-all">{referralLink}</p>
          </div>
          <button onClick={() => copyText(referralLink, 'link')}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${copied === 'link' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}>
            {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'link' ? 'Copied!' : 'Copy Referral Link'}
          </button>

          {/* Share Grid */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={shareWhatsApp} className="flex items-center justify-center gap-1.5 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black hover:bg-green-500/20 transition-all">
              <MessageCircle size={12} /> WhatsApp
            </button>
            <button onClick={shareTelegram} className="flex items-center justify-center gap-1.5 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl text-[10px] font-black hover:bg-sky-500/20 transition-all">
              <Share2 size={12} /> Telegram
            </button>
            <button onClick={shareTwitter} className="flex items-center justify-center gap-1.5 py-2 bg-foreground/5 border border-border text-foreground rounded-xl text-[10px] font-black hover:bg-foreground/10 transition-all">
              <ArrowUpRight size={12} /> X / Twitter
            </button>
          </div>

          {/* Native share */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button onClick={() => handleShare(`Earn ₹${friendGets} cashback!`, referralLink)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-all">
              <Zap size={13} /> Share via other apps
            </button>
          )}
        </motion.div>

        {/* Quick Share Templates */}
        <ShareTemplates friendGets={friendGets} offerName={link.offerName} link={referralLink} siteName={siteName} />

        {/* Community CTAs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-3">
          {telegramLink && (
            <a href={telegramLink} target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl font-syne font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #2481cc 0%, #1a6eb5 100%)' }}>
              <span className="text-lg">✈️</span> Join Our Telegram Channel <ExternalLink size={13} className="opacity-70" />
            </a>
          )}
          {socialLinks.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {socialLinks.slice(0, 4).map((l: { id?: string; name: string; url: string; iconUrl?: string }, i: number) => (
                <a key={l.id || i} href={l.url} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-background border border-border rounded-xl text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-all">
                  {l.iconUrl ? <img src={l.iconUrl} alt={l.name} className="w-4 h-4 rounded" /> : '🔗'} {l.name}
                </a>
              ))}
            </div>
          )}
          <Link to="/" className="w-full flex items-center justify-center gap-2 py-2.5 bg-card border border-border text-muted-foreground rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all">
            <Home size={12} /> Browse All Offers on {siteName}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function MiniStat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="text-center py-3 border-r border-border/40 last:border-r-0">
      <p className="text-[10px] mb-0.5">{icon}</p>
      <p className="font-syne font-black text-sm text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] font-black text-muted-foreground w-16 text-right">{label}</p>
      <div className="flex-1 h-4 bg-muted/10 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <p className="text-[10px] font-black text-foreground w-8">{value}</p>
    </div>
  );
}

function LeadRow({ lead }: { lead: MaskedLead }) {
  const isPaid = ['Approved', 'Cashback Sent', 'Paid'].includes(lead.status);
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-muted/20 border border-border flex items-center justify-center text-sm font-black text-muted-foreground flex-shrink-0">
        {lead.maskedName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-foreground">{lead.maskedName}</p>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[lead.status] || 'bg-border/20 text-muted-foreground border-border'}`}>
            {lead.status}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {lead.maskedUpi} · {(lead as any).maskedMobile || ''} · {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-syne font-black text-sm ${isPaid ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
          {isPaid ? `+₹${lead.referrerEarning}` : `₹${lead.referrerEarning}`}
        </p>
        <p className="text-[9px] text-muted-foreground">your cut</p>
      </div>
    </div>
  );
}

function ShareTemplates({ friendGets, offerName, link, siteName }: { friendGets: number; offerName: string; link: string; siteName: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const templates = [
    { label: '🎁 Cashback Pitch', text: `🎁 Complete ${offerName} and earn ₹${friendGets} cashback directly to your UPI!\n🔗 ${link}\n✨ Limited time only!` },
    { label: '💬 Casual Share', text: `Hey! Check this out — you can earn ₹${friendGets} cashback. I already earned from it. Try here: ${link}` },
    { label: '📢 Group Post', text: `🔥 ${siteName} Offer Alert!\n💰 Get ₹${friendGets} cashback on ${offerName}\n🔗 ${link}\n⏰ Don't miss it!` },
  ];

  function copyTemplate(text: string, idx: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      toast.success('Message copied!');
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle size={14} className="text-amber-400" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">📋 Ready-to-Share Messages</p>
      </div>
      <div className="space-y-2">
        {templates.map((t, idx) => (
          <button key={idx} onClick={() => copyTemplate(t.text, idx)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              copiedIdx === idx ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-background/50 border-border hover:border-primary/30'
            }`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black text-foreground">{t.label}</p>
              {copiedIdx === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-muted-foreground" />}
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{t.text}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
