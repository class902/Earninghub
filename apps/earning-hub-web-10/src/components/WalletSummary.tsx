import { motion } from 'framer-motion';
import type { SearchLeadsByUpiOutputType } from 'zitejs/api';

type TrackResult = SearchLeadsByUpiOutputType['leads'][0];

const VIP_LEVELS = [
  { name: 'Starter', icon: '🥉', min: 0, color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/30' },
  { name: 'Silver', icon: '🥈', min: 3, color: 'text-slate-300', bg: 'bg-slate-300/10 border-slate-300/30' },
  { name: 'Gold', icon: '🥇', min: 6, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  { name: 'Diamond', icon: '💎', min: 12, color: 'text-cyan-300', bg: 'bg-cyan-300/10 border-cyan-300/30' },
];

interface Props {
  leads: TrackResult[];
  upiId: string;
}

export default function WalletSummary({ leads, upiId }: Props) {
  if (!leads.length) return null;

  const paidLeads = leads.filter(l =>
    ['paid', 'cashback sent', 'approved'].includes(l.status.toLowerCase())
  );
  const pendingLeads = leads.filter(l =>
    ['pending', 'under review', 'on hold'].includes(l.status.toLowerCase())
  );
  const totalEarned = paidLeads.reduce((s, l) => s + (l.offerPayout || 0), 0);
  const totalPending = pendingLeads.reduce((s, l) => s + (l.offerPayout || 0), 0);

  const vipLevel = [...VIP_LEVELS].reverse().find(v => paidLeads.length >= v.min) || VIP_LEVELS[0];
  const nextLevel = VIP_LEVELS[VIP_LEVELS.indexOf(vipLevel) + 1];
  const progressToNext = nextLevel
    ? Math.min(100, Math.round((paidLeads.length / nextLevel.min) * 100))
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border overflow-hidden mb-2 bg-card"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-border/40 flex items-center justify-between">
        <div>
          <p className="font-syne font-black text-sm text-foreground">💼 My Cashback Wallet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{upiId}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black ${vipLevel.bg} ${vipLevel.color}`}>
          <span>{vipLevel.icon}</span>
          <span>{vipLevel.name} VIP</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-border/40">
        {[
          { label: 'Total Earned', value: `₹${totalEarned}`, sub: `${paidLeads.length} paid`, color: 'text-emerald-400' },
          { label: 'Pending', value: `₹${totalPending}`, sub: `${pendingLeads.length} active`, color: 'text-amber-400' },
          { label: 'Offers Applied', value: leads.length, sub: 'total', color: 'text-primary' },
        ].map(stat => (
          <div key={stat.label} className="px-3 py-4 text-center">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`font-syne font-black text-xl ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* VIP progress bar */}
      {nextLevel && (
        <div className="px-5 pb-4 border-t border-border/40 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Progress to {nextLevel.icon} {nextLevel.name}
            </p>
            <p className="text-[9px] font-black text-primary">{paidLeads.length}/{nextLevel.min} offers</p>
          </div>
          <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
