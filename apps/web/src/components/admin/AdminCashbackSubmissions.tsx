import { useState, useEffect } from 'react';
import { adminGetCashbackSubmissions, adminGetCashbackForms } from '@/lib/api';
import { toast } from 'sonner';

interface Props { password: string }

type Submission = { id: string; referenceId: string; formTitle: string; submissionData: string; submittedAt: string };

function SubmissionCard({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false);
  let data: Record<string, string> = {};
  try { data = JSON.parse(sub.submissionData); } catch {}

  const entries = Object.entries(data);
  const isProof = (v: string) => v.startsWith('http') && (v.includes('.jpg') || v.includes('.png') || v.includes('.pdf') || v.includes('fillout.com'));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-syne font-black text-sm text-foreground">{sub.referenceId}</span>
            <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">{sub.formTitle}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
          {!expanded && entries.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {entries.slice(0, 2).map(([k, v]) => `${k}: ${isProof(v) ? '[file]' : v}`).join(' · ')}
            </p>
          )}
        </div>
        <span className="text-muted-foreground text-sm flex-shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {entries.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground flex-shrink-0 pt-0.5">{label}</span>
              {isProof(value) ? (
                <a href={value} target="_blank" rel="noreferrer"
                  className="text-xs text-gold underline font-semibold">
                  {value.includes('.pdf') ? '📄 View PDF' : '🖼 View Image'}
                </a>
              ) : (
                <span className="text-xs text-foreground font-semibold text-right break-all">{value || '—'}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCashbackSubmissions({ password }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<{ title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sub, frm] = await Promise.all([
          adminGetCashbackSubmissions({ password }),
          adminGetCashbackForms({ password }),
        ]);
        setSubmissions(sub.submissions);
        setForms(frm.forms);
      } catch { toast.error('Failed to load submissions'); }
      finally { setLoading(false); }
    }
    load();
  }, [password]);

  const formTitles = [...new Set(submissions.map(s => s.formTitle))];

  const filtered = submissions.filter(s => {
    const matchForm = !filter || s.formTitle === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.referenceId.toLowerCase().includes(q) || s.submissionData.toLowerCase().includes(q);
    return matchForm && matchSearch;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="font-syne font-black text-2xl text-foreground">📨 Form Submissions</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          {submissions.length} total submission{submissions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reference ID or data..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-gold transition-colors font-satoshi"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-card border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-gold font-satoshi min-w-[180px]">
          <option value="">All Forms</option>
          {formTitles.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-syne font-black text-lg text-foreground mb-1">No Submissions</p>
          <p className="text-sm text-muted-foreground">{search || filter ? 'No results match your filters.' : 'No cashback proof submissions yet.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => <SubmissionCard key={s.id} sub={s} />)}
        </div>
      )}
    </div>
  );
}
