import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminGetLeads } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle, TrendingDown, TrendingUp, Search, RefreshCw, CheckCircle, Info } from 'lucide-react';
import type { Lead } from '@/types';

interface Props { password: string }

// ── Parse payout fields ───────────────────────────────────────────────────────
function parsePayouts(ac: string | undefined) {
  if (!ac) return { myEarning: 0, userPayout: 0, sendUserAmount: 0 };
  try {
    const p = JSON.parse(ac);
    return {
      myEarning: typeof p.myEarning === 'number' ? p.myEarning : 0,
      userPayout: typeof p.userPayout === 'number' ? p.userPayout : 0,
      sendUserAmount: typeof p.sendUserAmount === 'number' ? p.sendUserAmount : 0,
    };
  } catch { return { myEarning: 0, userPayout: 0, sendUserAmount: 0 }; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseData(lead: Lead): Record<string, any> {
  try { return JSON.parse(lead.leadData); } catch { return {}; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUPI(data: Record<string, any>): string {
  const entry = Object.entries(data).find(([k]) => k.toLowerCase().includes('upi'));
  return entry ? String(entry[1]) : '—';
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, bgColor, border, glow }: {
  icon: string; label: string; value: string | number; sub?: string;
  color: string; bgColor: string; border: string; glow?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 space-y-1 relative overflow-hidden ${border}`}
      style={{ background: bgColor, boxShadow: glow ? `0 0 24px ${glow}` : undefined }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`font-syne font-black text-2xl ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground font-semibold">{sub}</p>}
    </div>
  );
}

// ── Revenue Flow Bar ──────────────────────────────────────────────────────────
function FlowBar({ label, value, max, color, bgColor }: { label: string; value: number; max: number; color: string; bgColor: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-syne font-black text-sm ${color}`}>₹{value.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2.5 bg-border/30 rounded-full overflow-hidden">
        <motion.div className={`h-full rounded-full ${bgColor}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

// ── Missing Lead Row ──────────────────────────────────────────────────────────
function MissingLeadRow({ lead, index }: { lead: Lead; index: number }) {
  const data = parseData(lead);
  const upi = extractUPI(data);
  const p = parsePayouts(lead.actionConfig);
  const adminExpected = (lead.offerPayout || 0) - p.userPayout;
  const adminLoss = Math.max(0, adminExpected - p.myEarning);
  const userLoss = Math.max(0, p.userPayout - p.sendUserAmount);
  const totalMissing = adminLoss + userLoss;

  if (totalMissing === 0 && p.myEarning === 0 && p.userPayout === 0) return null;

  return (
    <motion.tr initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
      className="border-b border-border/40 last:border-0 hover:bg-background/40 transition-colors">
      <td className="px-4 py-3.5">
        <div>
          <p className="font-syne font-black text-xs text-primary">{lead.leadId}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[100px] truncate">{upi}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-bold max-w-[120px] truncate block">{lead.offerName}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
          lead.status === 'Missing' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
          lead.status === 'Cashback Sent' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' :
          'bg-border/20 text-muted-foreground border-border'
        }`}>{lead.status}</span>
      </td>
      <td className="px-4 py-3.5 font-syne font-black text-sm text-amber-400">₹{lead.offerPayout || 0}</td>
      <td className="px-4 py-3.5">
        <div className="space-y-0.5">
          <div className="text-xs font-black text-violet-400">₹{p.myEarning || '—'}</div>
          {adminLoss > 0 && (
            <div className="text-[9px] font-black text-red-400 flex items-center gap-1">
              <TrendingDown size={9} /> -₹{adminLoss}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="space-y-0.5">
          <div className="text-xs font-black text-sky-400">₹{p.userPayout || '—'}</div>
          <div className="text-xs font-bold text-emerald-400">₹{p.sendUserAmount || '—'}</div>
          {userLoss > 0 && (
            <div className="text-[9px] font-black text-red-400 flex items-center gap-1">
              <TrendingDown size={9} /> -₹{userLoss}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        {totalMissing > 0 ? (
          <span className="font-syne font-black text-sm text-red-400 flex items-center gap-1">
            <AlertTriangle size={12} /> ₹{totalMissing}
          </span>
        ) : (
          <span className="text-xs text-green-400 font-black">✓ OK</span>
        )}
      </td>
    </motion.tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MissingAnalysis({ password }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function loadLeads() {
    setLoading(true);
    adminGetLeads({ password })
      .then(r => setLeads(r.leads))
      .catch(() => toast.error('Failed to load leads'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadLeads(); }, [password]);

  // ── Aggregated Totals ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let totalLeadValue = 0;
    let totalAdminGot = 0;
    let totalUserEstimate = 0;
    let totalUserGot = 0;
    let leadsWithPayoutData = 0;
    let missingStatusCount = 0;

    leads.forEach(l => {
      totalLeadValue += l.offerPayout || 0;
      const p = parsePayouts(l.actionConfig);
      totalAdminGot += p.myEarning;
      totalUserEstimate += p.userPayout;
      totalUserGot += p.sendUserAmount;
      if (p.myEarning > 0 || p.userPayout > 0 || p.sendUserAmount > 0) leadsWithPayoutData++;
      if (l.status === 'Missing') missingStatusCount++;
    });

    const adminExpected = totalLeadValue - totalUserEstimate;
    const adminLoss = Math.max(0, adminExpected - totalAdminGot);
    const userLoss = Math.max(0, totalUserEstimate - totalUserGot);
    const totalMissing = adminLoss + userLoss;
    const unaccountedRevenue = totalLeadValue - totalAdminGot - totalUserEstimate;

    return {
      totalLeadValue,
      adminExpected,
      totalAdminGot,
      adminLoss,
      totalUserEstimate,
      totalUserGot,
      userLoss,
      totalMissing,
      unaccountedRevenue: Math.max(0, unaccountedRevenue),
      leadsWithPayoutData,
      missingStatusCount,
    };
  }, [leads]);

  // ── Filtered Leads Table ─────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || l.leadId.toLowerCase().includes(q) || l.offerName.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) || (() => {
          try { return JSON.stringify(JSON.parse(l.leadData)).toLowerCase().includes(q); } catch { return false; }
        })();
      const matchStatus = !statusFilter || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  // Per-offer missing analysis
  const offerMissingMap = useMemo(() => {
    const map = new Map<string, { name: string; totalLead: number; adminGot: number; userEstimate: number; userGot: number; count: number }>();
    leads.forEach(l => {
      const p = parsePayouts(l.actionConfig);
      if (!map.has(l.offerName)) {
        map.set(l.offerName, { name: l.offerName, totalLead: 0, adminGot: 0, userEstimate: 0, userGot: 0, count: 0 });
      }
      const entry = map.get(l.offerName)!;
      entry.totalLead += l.offerPayout || 0;
      entry.adminGot += p.myEarning;
      entry.userEstimate += p.userPayout;
      entry.userGot += p.sendUserAmount;
      entry.count++;
    });
    return [...map.values()].sort((a, b) => {
      const lossA = Math.max(0, (a.totalLead - a.userEstimate) - a.adminGot) + Math.max(0, a.userEstimate - a.userGot);
      const lossB = Math.max(0, (b.totalLead - b.userEstimate) - b.adminGot) + Math.max(0, b.userEstimate - b.userGot);
      return lossB - lossA;
    });
  }, [leads]);



  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-24 animate-pulse" />)}
      </div>
    </div>
  );

  const adminRecoveryRate = totals.adminExpected > 0 ? Math.round((totals.totalAdminGot / totals.adminExpected) * 100) : 0;
  const userPaymentRate = totals.totalUserEstimate > 0 ? Math.round((totals.totalUserGot / totals.totalUserEstimate) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-syne font-black text-lg text-foreground flex items-center gap-2">
            🔴 Missing Analysis
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track revenue gaps, unaccounted payouts, and leads marked as Missing status
          </p>
        </div>
        <button onClick={loadLeads}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border text-xs font-bold rounded-xl hover:border-primary hover:text-primary transition-all">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── What "Missing" Means ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-blue-500/25 bg-blue-500/5">
        <Info size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-black text-blue-400 mb-1">📘 Understanding Missing Analysis</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground/80">Missing Status</strong> = Leads manually marked as "Missing" by admin (user didn't complete the offer).{' '}
            <strong className="text-foreground/80">Admin Loss</strong> = Amount admin expected but didn't receive.{' '}
            <strong className="text-foreground/80">User Loss</strong> = Amount estimated for users but not yet paid out.
          </p>
        </div>
      </div>

      {/* ── Global Status: All Good or Issues Found ── */}
      {totals.totalMissing === 0 && totals.missingStatusCount === 0 ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-green-500/30 bg-green-500/5">
          <CheckCircle size={22} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="font-syne font-black text-sm text-green-400">✅ No Missing Revenue Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">All payouts are accounted for. No leads marked as Missing.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/40 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(244,63,94,0.04))' }}>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-syne font-black text-sm text-red-400">⚠️ Issues Detected — Review Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totals.missingStatusCount > 0 && <span><strong className="text-rose-400">{totals.missingStatusCount} leads</strong> marked Missing · </span>}
                {totals.totalMissing > 0 && <span>Revenue gap: <strong className="text-red-400">₹{totals.totalMissing.toLocaleString('en-IN')}</strong></span>}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-red-500/20 border-t border-red-500/20">
            {[
              { label: 'Missing Status Leads', value: totals.missingStatusCount, color: 'text-rose-400' },
              { label: 'Admin Loss', value: `₹${totals.adminLoss.toLocaleString('en-IN')}`, color: totals.adminLoss > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'User Loss', value: `₹${totals.userLoss.toLocaleString('en-IN')}`, color: totals.userLoss > 0 ? 'text-orange-400' : 'text-green-400' },
            ].map(item => (
              <div key={item.label} className="px-4 py-3 text-center">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                <p className={`font-syne font-black text-lg ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Overview Cards ── */}
      <div>
        <p className="font-syne font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <span>📊</span> Revenue Overview
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="💰" label="Total Lead Value" value={`₹${totals.totalLeadValue.toLocaleString('en-IN')}`}
            sub={`${leads.length} leads`}
            color="text-amber-400" bgColor="rgba(245,158,11,0.06)" border="border-amber-500/25" />
          <StatCard icon="✂️" label="Admin Expected" value={`₹${totals.adminExpected.toLocaleString('en-IN')}`}
            sub="Total − User Estimate"
            color="text-violet-400" bgColor="rgba(139,92,246,0.06)" border="border-violet-500/25" />
          <StatCard icon="📊" label="User Estimate" value={`₹${totals.totalUserEstimate.toLocaleString('en-IN')}`}
            sub="Planned user payouts"
            color="text-sky-400" bgColor="rgba(14,165,233,0.06)" border="border-sky-500/25" />
          <StatCard icon="✅" label="User Got" value={`₹${totals.totalUserGot.toLocaleString('en-IN')}`}
            sub="Actually paid out"
            color="text-emerald-400" bgColor="rgba(16,185,129,0.06)" border="border-emerald-500/25" />
        </div>
      </div>

      {/* ── Missing / Loss Analysis ── */}
      <div>
        <p className="font-syne font-black text-sm text-foreground mb-3 flex items-center gap-2">
          <span>🔴</span> Missing / Loss Analysis
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="🏦" label="Admin Got" value={`₹${totals.totalAdminGot.toLocaleString('en-IN')}`}
            sub={`${adminRecoveryRate}% recovery`}
            color="text-violet-400" bgColor="rgba(139,92,246,0.06)" border="border-violet-500/25" />
          <StatCard icon="📉" label="Admin Loss" value={`₹${totals.adminLoss.toLocaleString('en-IN')}`}
            sub={`Expected ₹${totals.adminExpected.toLocaleString('en-IN')}`}
            color={totals.adminLoss > 0 ? "text-red-400" : "text-green-400"}
            bgColor={totals.adminLoss > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.06)"}
            border={totals.adminLoss > 0 ? "border-red-500/30" : "border-green-500/25"}
            glow={totals.adminLoss > 0 ? "rgba(239,68,68,0.1)" : undefined} />
          <StatCard icon="💸" label="User Loss" value={`₹${totals.userLoss.toLocaleString('en-IN')}`}
            sub={`${userPaymentRate}% paid of estimate`}
            color={totals.userLoss > 0 ? "text-orange-400" : "text-green-400"}
            bgColor={totals.userLoss > 0 ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.06)"}
            border={totals.userLoss > 0 ? "border-orange-500/30" : "border-green-500/25"} />
          <StatCard icon="❗" label="Total Missing" value={`₹${totals.totalMissing.toLocaleString('en-IN')}`}
            sub="Admin Loss + User Loss"
            color={totals.totalMissing > 0 ? "text-red-400" : "text-green-400"}
            bgColor={totals.totalMissing > 0 ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.06)"}
            border={totals.totalMissing > 0 ? "border-red-500/35" : "border-green-500/25"}
            glow={totals.totalMissing > 0 ? "rgba(239,68,68,0.15)" : undefined} />
        </div>
      </div>

      {/* ── Calculation Explained ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <span className="text-base">🧮</span>
          <span className="font-syne font-black text-foreground text-sm">How Missing is Calculated</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Admin Side */}
          <div className="p-4 rounded-xl border border-violet-500/20" style={{ background: 'rgba(139,92,246,0.05)' }}>
            <p className="font-syne font-black text-xs text-violet-400 uppercase tracking-wider mb-3">✂️ Admin Side</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Lead Value</span>
                <span className="font-black text-amber-400">₹{totals.totalLeadValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">− User Estimate</span>
                <span className="font-black text-sky-400">₹{totals.totalUserEstimate.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2">
                <span className="text-muted-foreground font-bold">= Admin Expected</span>
                <span className="font-black text-violet-400">₹{totals.adminExpected.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">− Admin Got</span>
                <span className="font-black text-violet-400">₹{totals.totalAdminGot.toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between border-t border-border/40 pt-2 font-black text-base ${totals.adminLoss > 0 ? 'text-red-400' : 'text-green-400'}`}>
                <span>= Admin Loss</span>
                <span>{totals.adminLoss > 0 ? `-₹${totals.adminLoss.toLocaleString('en-IN')}` : '✅ No loss'}</span>
              </div>
            </div>
          </div>
          {/* User Side */}
          <div className="p-4 rounded-xl border border-sky-500/20" style={{ background: 'rgba(14,165,233,0.05)' }}>
            <p className="font-syne font-black text-xs text-sky-400 uppercase tracking-wider mb-3">👤 User Side</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Estimate</span>
                <span className="font-black text-sky-400">₹{totals.totalUserEstimate.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">− User Got</span>
                <span className="font-black text-emerald-400">₹{totals.totalUserGot.toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between border-t border-border/40 pt-2 font-black text-base ${totals.userLoss > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                <span>= User Loss</span>
                <span>{totals.userLoss > 0 ? `-₹${totals.userLoss.toLocaleString('en-IN')}` : '✅ No loss'}</span>
              </div>
              <div className="flex justify-between pt-2 text-muted-foreground text-xs">
                <span>Unaccounted Revenue</span>
                <span className={totals.unaccountedRevenue > 0 ? 'text-amber-400 font-black' : 'text-muted-foreground'}>
                  {totals.unaccountedRevenue > 0 ? `₹${totals.unaccountedRevenue.toLocaleString('en-IN')}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revenue Flow Visualization ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp size={15} className="text-primary" />
          <span className="font-syne font-black text-foreground text-sm">Revenue Flow Breakdown</span>
        </div>
        <div className="p-5 space-y-4">
          <FlowBar label="💰 Total Lead Value" value={totals.totalLeadValue} max={totals.totalLeadValue} color="text-amber-400" bgColor="bg-amber-500" />
          <FlowBar label="✂️ Admin Expected" value={totals.adminExpected} max={totals.totalLeadValue} color="text-violet-400" bgColor="bg-violet-500" />
          <FlowBar label="🏦 Admin Got" value={totals.totalAdminGot} max={totals.totalLeadValue} color="text-violet-300" bgColor="bg-violet-400" />
          <FlowBar label="📊 User Estimate" value={totals.totalUserEstimate} max={totals.totalLeadValue} color="text-sky-400" bgColor="bg-sky-500" />
          <FlowBar label="✅ User Got" value={totals.totalUserGot} max={totals.totalLeadValue} color="text-emerald-400" bgColor="bg-emerald-500" />
          {totals.totalMissing > 0 && (
            <FlowBar label="❗ Total Missing" value={totals.totalMissing} max={totals.totalLeadValue} color="text-red-400" bgColor="bg-red-500" />
          )}
        </div>
      </div>

      {/* ── Per-Offer Missing Analysis ── */}
      {offerMissingMap.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="font-syne font-black text-foreground text-sm">Missing by Offer</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  {['Offer', 'Leads', 'Total Lead', 'Admin Got', 'Admin Loss', 'User Est.', 'User Got', 'User Loss', 'Total Missing'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerMissingMap.slice(0, 10).map((offer, i) => {
                  const adminExp = offer.totalLead - offer.userEstimate;
                  const adminL = Math.max(0, adminExp - offer.adminGot);
                  const userL = Math.max(0, offer.userEstimate - offer.userGot);
                  const totalM = adminL + userL;
                  return (
                    <motion.tr key={offer.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-border/40 last:border-0 hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-bold max-w-[120px] truncate block">{offer.name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-foreground">{offer.count}</td>
                      <td className="px-4 py-3 font-syne font-black text-sm text-amber-400">₹{offer.totalLead.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-syne font-black text-sm text-violet-400">
                        {offer.adminGot > 0 ? `₹${offer.adminGot.toLocaleString('en-IN')}` : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {adminL > 0 ? <span className="font-syne font-black text-sm text-red-400 flex items-center gap-1"><TrendingDown size={11} />₹{adminL.toLocaleString('en-IN')}</span> :
                          <span className="text-xs text-green-400 font-black">✓</span>}
                      </td>
                      <td className="px-4 py-3 font-syne font-black text-sm text-sky-400">
                        {offer.userEstimate > 0 ? `₹${offer.userEstimate.toLocaleString('en-IN')}` : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 font-syne font-black text-sm text-emerald-400">
                        {offer.userGot > 0 ? `₹${offer.userGot.toLocaleString('en-IN')}` : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {userL > 0 ? <span className="font-syne font-black text-sm text-orange-400 flex items-center gap-1"><TrendingDown size={11} />₹{userL.toLocaleString('en-IN')}</span> :
                          <span className="text-xs text-green-400 font-black">✓</span>}
                      </td>
                      <td className="px-4 py-3">
                        {totalM > 0 ? <span className="font-syne font-black text-sm text-red-400">₹{totalM.toLocaleString('en-IN')}</span> :
                          <span className="text-xs text-green-400 font-black">✅ OK</span>}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lead-Level Missing Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle size={15} className="text-amber-400" />
            <span className="font-syne font-black text-foreground text-sm">Lead-Level Missing Breakdown</span>
            <span className="text-xs text-muted-foreground">({filteredLeads.length} leads)</span>
            {/* Quick filter chips */}
            <button onClick={() => setStatusFilter(statusFilter === 'Missing' ? '' : 'Missing')}
              className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${
                statusFilter === 'Missing' ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-400'
              }`}>
              🔴 Missing Only {totals.missingStatusCount > 0 && `(${totals.missingStatusCount})`}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="pl-9 pr-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary transition-colors w-48" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-background border border-border text-foreground text-xs rounded-xl focus:outline-none focus:border-primary">
              <option value="">All Status</option>
              {['Pending', 'Hold', 'Approved', 'Cashback Sent', 'Missing'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(search || statusFilter) && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); }}
                className="text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
                Clear ✕
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background/30">
                {['Lead ID / UPI', 'Offer', 'Status', 'Total Lead', 'Admin Side', 'User Side', 'Missing'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.slice(0, 50).map((lead, i) => (
                <MissingLeadRow key={lead.id} lead={lead} index={i} />
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="font-syne font-black text-foreground">No missing data found</p>
              <p className="text-xs text-muted-foreground mt-1">All leads match or no filters match.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Missing Status Leads — prominent section ── */}
      {totals.missingStatusCount > 0 && (
        <div className="bg-card border border-rose-500/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-rose-500/20 flex items-center justify-between gap-3"
            style={{ background: 'rgba(244,63,94,0.05)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">🔴</span>
              <span className="font-syne font-black text-rose-400 text-sm">
                Leads Marked "Missing" ({totals.missingStatusCount})
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">These users did NOT complete the offer / tracking failed</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {leads.filter(l => l.status === 'Missing').slice(0, 20).map((l, idx) => {
                const data = parseData(l);
                const upi = extractUPI(data);
                const p = parsePayouts(l.actionConfig);
                const userGap = Math.max(0, p.userPayout - p.sendUserAmount);
                return (
                  <motion.div key={l.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                    className="flex items-start gap-3 p-3 bg-background border border-rose-500/20 rounded-xl hover:border-rose-500/40 transition-all">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-sm">🔴</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-syne font-black text-xs text-rose-400">{l.leadId}</p>
                        <span className="text-[9px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded font-bold">MISSING</span>
                      </div>
                      <p className="text-[11px] text-foreground font-bold truncate mt-0.5">{l.offerName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{upi}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Lead ₹{l.offerPayout}</span>
                        {p.userPayout > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">Est ₹{p.userPayout}</span>}
                        {p.sendUserAmount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Got ₹{p.sendUserAmount}</span>}
                        {userGap > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">Gap ₹{userGap}</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Summary Footer ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: '📋', label: 'Total Leads', value: leads.length, color: 'text-foreground' },
          { icon: '💡', label: 'Leads with Payout Data', value: totals.leadsWithPayoutData, color: 'text-primary' },
          { icon: '🔴', label: 'Missing Status Leads', value: totals.missingStatusCount, color: 'text-rose-400' },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <span className="text-lg">{item.icon}</span>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`font-syne font-black text-xl ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
