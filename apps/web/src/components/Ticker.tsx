import type { Offer } from '@/types';

interface Props { offers: Offer[]; customText?: string; tickerLabel?: string }

export default function Ticker({ offers, customText, tickerLabel }: Props) {
  // If admin set custom ticker text, parse it into segments
  if (customText && customText.trim()) {
    const segments = customText.split('|').map(s => s.trim()).filter(Boolean);
    const doubled = [...segments, ...segments, ...segments];
    return (
      <div className="relative z-10 border-y border-border overflow-hidden flex items-stretch bg-card/95 backdrop-blur-sm">
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-r border-border bg-primary/10 z-10">
          <span className="relative flex">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary whitespace-nowrap">{tickerLabel || 'Announcements'}</span>
        </div>
        <div className="overflow-hidden flex-1 py-2.5">
          <div className="flex gap-12 whitespace-nowrap ticker-scroll" style={{ width: 'max-content' }}>
            {doubled.map((seg, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-xs text-foreground font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 opacity-80" />
                <span>{seg}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const items = offers.length > 0 ? offers : [
    { id: '1', name: 'IndiaBulls Demat', payout: 200 } as Offer,
    { id: '2', name: 'Kotak 811 Classic', payout: 300 } as Offer,
    { id: '3', name: 'Zepto Grocery', payout: 120 } as Offer,
    { id: '4', name: 'Upstox Pro', payout: 500 } as Offer,
  ];

  const doubled = [...items, ...items];

  return (
    <div className="relative z-10 border-y border-border overflow-hidden flex items-stretch bg-card/95 backdrop-blur-sm">
      {/* LIVE label */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-r border-border bg-primary/10 z-10">
        <span className="relative flex">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-primary whitespace-nowrap">{tickerLabel || 'Live Payouts'}</span>
      </div>

      {/* Scrolling items */}
      <div className="overflow-hidden flex-1 py-2.5">
        <div className="flex gap-12 whitespace-nowrap ticker-scroll" style={{ width: 'max-content' }}>
          {doubled.map((o, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-xs text-muted-foreground font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 opacity-80" />
              <span className="text-foreground">{o.name}</span>
              <span className="text-primary font-black font-syne">₹{o.payout}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
