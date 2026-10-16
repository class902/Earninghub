import { useState, useEffect } from 'react';
import { adminGetOffers, checkLinkHealth, CheckLinkHealthOutputType } from 'zitejs/api';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, Skull } from 'lucide-react';
import { toast } from 'sonner';

interface Props { password: string }

type LinkResult = CheckLinkHealthOutputType['results'][0];
type LinkStatus = LinkResult['status'];

interface OfferLinkStatus {
  id: string;
  name: string;
  url: string;
  status: 'pending' | LinkStatus;
  httpStatus?: number;
  responseTime?: number;
  checkedAt?: string;
  pageTitle?: string;
  ogImage?: string;
  ogDescription?: string;
  detectedKeywords?: string[];
  previousStatus?: 'pending' | LinkStatus;
}

export default function LinkTester({ password }: Props) {
  const [offers, setOffers] = useState<OfferLinkStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    adminGetOffers({ password }).then(res => {
      setOffers(
        res.offers
          .filter(o => o.redirectLink && o.status === 'Active')
          .map(o => ({
            id: o.id,
            name: o.name,
            url: o.redirectLink,
            status: 'pending',
          }))
      );
    }).finally(() => setLoading(false));
  }, [password]);

  async function runTests() {
    if (offers.length === 0) { toast.error('No active offers with links to test.'); return; }
    setTesting(true);
    setProgress(0);
    toast.info(`🔗 Deep checking ${offers.length} links server-side…`);

    // Save previous status for change detection
    setOffers(prev => prev.map(o => ({ ...o, previousStatus: o.status !== 'pending' ? o.status : undefined, status: 'pending' as const })));

    // Batch in groups of 5 to avoid timeout
    const BATCH_SIZE = 5;
    const allOffers = [...offers];
    let completed = 0;

    for (let i = 0; i < allOffers.length; i += BATCH_SIZE) {
      const batch = allOffers.slice(i, i + BATCH_SIZE);
      try {
        const res = await checkLinkHealth({
          password,
          urls: batch.map(o => ({ id: o.id, name: o.name, url: o.url })),
        });
        res.results.forEach(r => {
          setOffers(prev => prev.map(o => o.id === r.id ? {
            ...o,
            status: r.status,
            httpStatus: r.httpStatus,
            responseTime: r.responseTime,
            checkedAt: r.checkedAt,
            pageTitle: r.pageTitle,
            ogImage: r.ogImage,
            ogDescription: r.ogDescription,
            detectedKeywords: r.detectedKeywords,
          } : o));
        });
      } catch {
        batch.forEach(b => {
          setOffers(prev => prev.map(o => o.id === b.id ? { ...o, status: 'error' } : o));
        });
      }
      completed += batch.length;
      setProgress(Math.round((completed / allOffers.length) * 100));
    }

    setTesting(false);
    // Summary
    setTimeout(() => {
      setOffers(current => {
        const expired = current.filter(o => o.status === 'expired').length;
        const broken = current.filter(o => o.status === 'broken').length;
        const changed = current.filter(o => o.previousStatus && o.previousStatus !== o.status).length;
        if (expired > 0) toast.error(`⚠️ ${expired} expired campaign${expired > 1 ? 's' : ''} detected!`);
        else if (broken > 0) toast.error(`❌ ${broken} broken link${broken > 1 ? 's' : ''} found!`);
        else toast.success('✅ All links appear healthy!');
        if (changed > 0) toast.info(`🔄 ${changed} link${changed > 1 ? 's' : ''} changed status since last check`);
        return current;
      });
    }, 300);
  }

  const statusIcon = (s: OfferLinkStatus['status']) => {
    if (s === 'live') return <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />;
    if (s === 'expired') return <Skull size={16} className="text-orange-400 flex-shrink-0" />;
    if (s === 'broken') return <XCircle size={16} className="text-red-400 flex-shrink-0" />;
    if (s === 'timeout') return <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />;
    if (s === 'error') return <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />;
    return <Clock size={16} className="text-muted-foreground/40 flex-shrink-0" />;
  };

  const statusBadge = (s: OfferLinkStatus['status'], code?: number) => {
    if (s === 'live') return <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">✅ LIVE</span>;
    if (s === 'expired') return <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">💀 EXPIRED</span>;
    if (s === 'broken') return <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">❌ {code || '404'}</span>;
    if (s === 'timeout') return <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">⚠️ Timeout</span>;
    if (s === 'error') return <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">⚠️ Error</span>;
    return <span className="text-[10px] font-black text-muted-foreground/40 px-2 py-0.5 rounded-full">— Pending</span>;
  };

  const statusChangeBadge = (o: OfferLinkStatus) => {
    if (!o.previousStatus || o.previousStatus === 'pending' || o.status === 'pending') return null;
    if (o.previousStatus === o.status) return null;
    const wasLive = o.previousStatus === 'live';
    const nowExpired = o.status === 'expired' || o.status === 'broken';
    if (wasLive && nowExpired) {
      return <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">🔴 WAS LIVE → NOW DEAD</span>;
    }
    return <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">🔄 Changed</span>;
  };

  const stats = {
    total: offers.length,
    live: offers.filter(o => o.status === 'live').length,
    expired: offers.filter(o => o.status === 'expired').length,
    broken: offers.filter(o => o.status === 'broken').length,
    error: offers.filter(o => o.status === 'error' || o.status === 'timeout').length,
    pending: offers.filter(o => o.status === 'pending').length,
    changed: offers.filter(o => o.previousStatus && o.previousStatus !== 'pending' && o.previousStatus !== o.status).length,
  };

  if (loading) return (
    <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-16 animate-pulse" />)}</div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-syne font-black text-foreground text-lg flex items-center gap-2">🔗 Link Health Tester</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Deep server-side check — detects expired campaigns, "offer closed" pages, and broken links.
            </p>
          </div>
          <button
            onClick={runTests}
            disabled={testing || offers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all shadow-lg flex-shrink-0"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? `Testing… ${progress}%` : `Deep Check ${offers.length} Links`}
          </button>
        </div>

        {testing && (
          <div className="mt-4">
            <div className="h-2 bg-border/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{progress}% complete · checking HTML content server-side…</p>
          </div>
        )}

        {stats.live + stats.expired + stats.broken + stats.error > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
            {[
              { label: 'Live', value: stats.live, color: 'text-emerald-400', icon: '✅' },
              { label: 'Expired', value: stats.expired, color: 'text-orange-400', icon: '💀' },
              { label: 'Broken', value: stats.broken, color: 'text-red-400', icon: '❌' },
              { label: 'Error', value: stats.error, color: 'text-amber-400', icon: '⚠️' },
              { label: 'Pending', value: stats.pending, color: 'text-muted-foreground', icon: '⏳' },
              { label: 'Changed', value: stats.changed, color: 'text-blue-400', icon: '🔄' },
            ].map(s => (
              <div key={s.label} className="bg-background border border-border rounded-xl p-3 text-center">
                <p className={`font-syne font-black text-xl ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mt-0.5">{s.icon} {s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired campaign alerts */}
      {stats.expired > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skull size={18} className="text-orange-400" />
            <p className="font-syne font-black text-sm text-orange-400">
              {stats.expired} Campaign{stats.expired > 1 ? 's' : ''} Expired / Closed
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These links show "campaign over", "offer expired", or similar messages. Users clicking these will see dead pages. Consider deactivating these offers.
          </p>
          <div className="space-y-2">
            {offers.filter(o => o.status === 'expired').map(o => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2.5 bg-background border border-orange-500/20 rounded-xl">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="font-syne font-black text-sm text-foreground truncate">{o.name}</p>
                  {o.detectedKeywords && o.detectedKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {o.detectedKeywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          "{kw}"
                        </span>
                      ))}
                    </div>
                  )}
                  {o.pageTitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">📄 {o.pageTitle}</p>}
                </div>
                <a href={o.url} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all flex-shrink-0">
                  <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status change alerts */}
      {stats.changed > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400">🔄</span>
            <p className="font-syne font-black text-sm text-blue-400">
              {stats.changed} Link{stats.changed > 1 ? 's' : ''} Changed Status
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            These links had a different status on the previous check. Review them to ensure offers are still active.
          </p>
        </div>
      )}

      {/* Link list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="font-syne font-black text-foreground text-sm">{offers.length} Active Offer Links</span>
        </div>
        {offers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No active offers with redirect links.</div>
        ) : (
          <div className="divide-y divide-border/40">
            <AnimatePresence>
              {offers.map((offer, i) => (
                <motion.div key={offer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`px-5 py-4 hover:bg-primary/5 transition-colors ${
                    offer.status === 'expired' ? 'bg-orange-500/5' :
                    offer.status === 'broken' ? 'bg-red-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {statusIcon(offer.status)}
                    {offer.ogImage && offer.status !== 'pending' && (
                      <img src={offer.ogImage} alt="" className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-syne font-black text-sm text-foreground truncate">{offer.name}</p>
                        {statusChangeBadge(offer)}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{offer.url}</p>
                      {offer.pageTitle && offer.status !== 'pending' && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">📄 {offer.pageTitle}</p>
                      )}
                      {offer.detectedKeywords && offer.detectedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {offer.detectedKeywords.map((kw, ki) => (
                            <span key={ki} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                              ⚠ {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {offer.responseTime != null && offer.status !== 'pending' && (
                        <span className="text-[10px] text-muted-foreground">{offer.responseTime}ms</span>
                      )}
                      {offer.checkedAt && (
                        <span className="text-[9px] text-muted-foreground/50 hidden md:block">
                          {new Date(offer.checkedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {statusBadge(offer.status, offer.httpStatus)}
                      <a href={offer.url} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 📸 Recent Link Previews */}
      {(() => {
        const withOg = offers.filter(o => o.ogImage && o.status !== 'pending');
        if (withOg.length === 0) return null;
        const recent = withOg.slice(-2);
        return (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <h3 className="font-syne font-black text-foreground text-sm">Recent Link Previews</h3>
              <span className="text-[10px] font-black text-muted-foreground ml-auto">Last {recent.length} with preview</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map(o => (
                <a key={o.id} href={o.url} target="_blank" rel="noreferrer"
                  className="block rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all group">
                  {o.ogImage && (
                    <div className="h-36 overflow-hidden bg-muted">
                      <img src={o.ogImage} alt={o.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <p className="font-syne font-black text-sm text-foreground truncate">{o.name}</p>
                    {o.pageTitle && <p className="text-[10px] text-muted-foreground truncate">📄 {o.pageTitle}</p>}
                    {o.ogDescription && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{o.ogDescription}</p>}
                    <div className="flex items-center gap-2 pt-1">
                      {statusBadge(o.status, o.httpStatus)}
                      {o.responseTime != null && <span className="text-[10px] text-muted-foreground">{o.responseTime}ms</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Info box */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-border bg-primary/5">
        <span className="text-primary flex-shrink-0 mt-0.5">ℹ️</span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Deep Check Mode:</strong> Links are fetched server-side and the HTML content is scanned for keywords like
          "campaign over", "offer expired", "thank you for participating", etc.{' '}
          <strong className="text-emerald-400">✅ LIVE</strong> = page loads normally.{' '}
          <strong className="text-orange-400">💀 EXPIRED</strong> = campaign ended keywords detected.{' '}
          <strong className="text-red-400">❌ BROKEN</strong> = 404/error.{' '}
          <strong className="text-blue-400">🔄 Changed</strong> = status different from last check.
        </p>
      </div>
    </div>
  );
}
