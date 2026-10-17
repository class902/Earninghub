interface Props {
  funnel: { stage: string; count: number }[];
}

export default function ReferralFunnel({ funnel }: Props) {
  const max = Math.max(...funnel.map(f => f.count), 1);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">📊</span>
        <span className="font-syne font-black text-sm text-foreground">Referral Funnel</span>
      </div>
      <div className="space-y-2">
        {funnel.map((stage, idx) => {
          const pct = max > 0 ? (stage.count / max) * 100 : 0;
          const dropOff = idx > 0 && funnel[idx - 1].count > 0
            ? Math.round(((funnel[idx - 1].count - stage.count) / funnel[idx - 1].count) * 100)
            : 0;
          const colors = [
            'bg-blue-500/20 border-blue-500/30',
            'bg-sky-500/20 border-sky-500/30',
            'bg-amber-500/20 border-amber-500/30',
            'bg-emerald-500/20 border-emerald-500/30',
            'bg-emerald-500/30 border-emerald-500/40',
            'bg-green-500/20 border-green-500/30',
            'bg-green-500/30 border-green-500/40',
          ];
          const barColors = [
            'bg-blue-500',
            'bg-sky-500',
            'bg-amber-500',
            'bg-emerald-500',
            'bg-emerald-600',
            'bg-green-500',
            'bg-green-600',
          ];

          return (
            <div key={stage.stage} className={`flex items-center gap-3 p-2.5 rounded-xl border ${colors[idx % colors.length]}`}>
              <div className="w-28 flex-shrink-0">
                <p className="text-[10px] font-black text-foreground leading-tight">{stage.stage}</p>
                {dropOff > 0 && idx > 0 && (
                  <p className="text-[9px] text-red-400 mt-0.5">↓ {dropOff}% drop</p>
                )}
              </div>
              <div className="flex-1 h-5 bg-background/50 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="font-syne font-black text-sm text-foreground w-12 text-right flex-shrink-0">
                {stage.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
