import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import TrackLeadPanel from '@/components/TrackLeadPanel';
import { useAppContext } from '@/contexts/AppContext';

interface Props { onClose: () => void }

export default function GlobalTrackModal({ onClose }: Props) {
  const { settings } = useAppContext();

  // Build dynamic subtitle from active search toggles
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (settings?.trackByUpi ?? true) parts.push('UPI ID');
    if (settings?.trackByName ?? true) parts.push('Name');
    if ((settings as { trackByMobile?: boolean } | null)?.trackByMobile ?? true) parts.push('Mobile');
    if ((settings as { trackByEmail?: boolean } | null)?.trackByEmail ?? false) parts.push('Email');
    return parts.length > 0 ? `Enter your ${parts.join(', ')} to check lead & payment status` : 'Enter your details to check lead & payment status';
  }, [settings]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg md:max-w-2xl mx-auto bg-card border border-border rounded-t-3xl md:rounded-3xl shadow-2xl animate-fade-up overflow-hidden"
        style={{ maxHeight: '92dvh' }}>
        {/* Top drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br from-primary to-blue-400 blue-glow-sm flex-shrink-0">
            🔍
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-syne font-black text-foreground text-base leading-none">Track Your Cashback</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(92dvh - 80px)' }}>
          <TrackLeadPanel />
        </div>
      </div>
    </div>
  );
}
