import { useRef, useState } from 'react';
import { uploadFile } from 'zitejs/upload';
import { toast } from 'sonner';

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  aspectHint?: string;
}

export default function ImageUploadField({ label, value, onChange, hint, aspectHint }: Props) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      onChange(fileUrl);
      toast.success('Image uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  }

  return (
    <div>
      <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label} {aspectHint && <span className="font-normal normal-case tracking-normal text-[10px]">({aspectHint})</span>}
      </label>
      <div className="flex gap-2 items-center">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Paste image URL or click upload ↗"
          className="flex-1 px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi"
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="px-3 py-2.5 bg-primary/10 border border-primary/20 text-primary text-xs font-black rounded-xl hover:bg-primary/20 transition-all disabled:opacity-60 flex-shrink-0"
        >
          {uploading ? '⏳' : '📤 Upload'}
        </button>
        <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif,.svg" onChange={handleFile} />
      </div>
      {value && (
        <div className="mt-2 flex items-center gap-3 bg-background border border-border rounded-xl p-2">
          <img
            src={value}
            alt="preview"
            className="h-12 w-20 rounded-lg object-cover border border-border flex-shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-muted-foreground truncate">{value}</span>
          <button onClick={() => onChange('')} className="text-destructive text-xs hover:text-destructive/80 flex-shrink-0">✕</button>
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
