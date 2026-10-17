import { appPath } from '@/lib/appUrl';
import { useState } from 'react';

interface Props {
  hasFormEnabled: boolean;
  onOpenForm: () => void;
  googleFormUrl: string;
  googleFormLabel: string;
  googleFormEnabled: boolean;
}

interface FabItem {
  id: string;
  icon: string;
  label: string;
  color: string;
  glow: string;
  action: 'link' | 'button' | 'external';
  href?: string;
  onClick?: () => void;
}

export default function HomeFABs({ hasFormEnabled, onOpenForm, googleFormUrl, googleFormLabel, googleFormEnabled }: Props) {
  const [expanded, setExpanded] = useState(true);

  const items: FabItem[] = [
    {
      id: 'offers',
      icon: '🎯',
      label: 'Live Offers',
      color: 'from-primary to-blue-400',
      glow: 'rgba(59,130,246,0.35)',
      action: 'link',
      href: '#offers',
    },
    ...(hasFormEnabled ? [{
      id: 'cashback',
      icon: '📝',
      label: 'Cashback Form',
      color: 'from-gold to-fire',
      glow: 'rgba(240,180,41,0.35)',
      action: 'button' as const,
      onClick: onOpenForm,
    }] : []),
    ...(googleFormEnabled && googleFormUrl ? [{
      id: 'gform',
      icon: '🔗',
      label: googleFormLabel || 'Apply Now',
      color: 'from-green-500 to-emerald-400',
      glow: 'rgba(34,197,94,0.35)',
      action: 'external' as const,
      href: googleFormUrl,
    }] : []),
  ];

  if (items.length === 0) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2.5 items-end">
      {/* Toggle tab */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-7 h-16 flex items-center justify-center rounded-l-xl border border-r-0 bg-card border-border text-muted-foreground hover:text-primary hover:border-primary transition-all shadow-xl"
        title={expanded ? 'Hide menu' : 'Show quick access'}>
        <span className="text-xs font-black">{expanded ? '›' : '‹'}</span>
      </button>

      {/* FAB items */}
      {expanded && items.map((item, i) => {
        const cls = `group flex items-center gap-2.5 pl-4 pr-4 py-2.5 rounded-l-2xl font-syne font-black text-sm text-white shadow-xl transition-all duration-200 hover:-translate-x-1 active:scale-95 border border-r-0 border-white/10 bg-gradient-to-r ${item.color}`;
        const style = { boxShadow: `0 4px 24px ${item.glow}`, animationDelay: `${i * 0.05}s` };

        if (item.action === 'link') {
          return (
            <a key={item.id} href={appPath(item.href)} className={cls} style={style}>
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
            </a>
          );
        }
        if (item.action === 'external') {
          return (
            <a key={item.id} href={item.href} target="_blank" rel="noreferrer" className={cls} style={style}>
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
            </a>
          );
        }
        return (
          <button key={item.id} onClick={item.onClick} className={cls} style={style}>
            <span className="text-base">{item.icon}</span>
            <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
