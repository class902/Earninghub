interface Props {
  onConfirm: () => void;
  onClose: () => void;
  bannerUrl?: string; // Custom banner uploaded by admin
}

export default function WiFiWarning({ onConfirm, onClose, bannerUrl }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {bannerUrl ? (
        /* ── Custom Banner Mode ── */
        <div
          className="relative rounded-3xl overflow-hidden max-w-[320px] w-full"
          style={{
            border: '3px solid #a3e635',
            boxShadow: '0 0 0 4px #a3e635, 0 0 50px rgba(163,230,53,0.55), 0 30px 70px rgba(0,0,0,0.7)',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all font-bold text-sm"
          >
            ✕
          </button>

          {/* Custom banner with warning overlay */}
          <div className="relative">
            <img
              src={bannerUrl}
              alt="Use Mobile Internet"
              className="w-full object-cover block"
              style={{ maxHeight: 200 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <div className="relative">
                  <span style={{ fontSize: 26 }}>📶</span>
                  <span className="absolute -bottom-1 -right-1.5" style={{ fontSize: 14 }}>❌</span>
                </div>
                <span className="font-black text-white text-lg ml-1">Don't Use WiFi</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                Switch to <span className="text-lime-300 font-bold">Mobile Internet</span> for conversion tracking
              </p>
            </div>
          </div>

          <div className="bg-card px-5 py-4 text-center">
            <button
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
            >
              ✅ Yes, I'm Not using WiFi
            </button>
          </div>
        </div>
      ) : (
        /* ── Default Mode ── */
        <div
          className="relative rounded-3xl p-8 max-w-[300px] w-full text-center bg-card"
          style={{
            border: '3px solid #a3e635',
            boxShadow: '0 0 0 4px #a3e635, 0 0 50px rgba(163,230,53,0.55), 0 30px 70px rgba(0,0,0,0.65)',
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold transition-all"
          >
            ✕
          </button>

          <div className="text-5xl mb-4">⚠️</div>

          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="relative">
              <span style={{ fontSize: 30 }}>📶</span>
              <span className="absolute -bottom-1 -right-2" style={{ fontSize: 18 }}>❌</span>
            </div>
            <span className="font-black text-xl text-gray-900 ml-3">Don't Use WiFi</span>
          </div>

          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Your conversion will be only tracked with{' '}
            <span className="font-semibold" style={{ color: '#16a34a' }}>Mobile Internet.</span>
          </p>

          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
          >
            Yes, I'm Not using WiFi
          </button>
        </div>
      )}
    </div>
  );
}
