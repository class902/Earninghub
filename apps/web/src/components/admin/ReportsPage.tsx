import { useEffect, useState, useMemo } from 'react';
import { adminGetLeads } from '@/lib/api';
import { toast } from 'sonner';
import type { Lead } from '@/types';

interface Props { password: string }

const STATUS_OPTS = ['All', 'Pending', 'On Hold', 'Approved', 'Cashback Sent', 'Missing', 'Paid'];
const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'In Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Hold: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  'Cashback Sent': 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  Missing: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  // Legacy
  'Under Review': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'On Hold': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Duplicate: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const PAGE_SIZE = 25;

export default function ReportsPage({ password }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    adminGetLeads({ password })
      .then(r => setLeads(r.leads))
      .catch(() => toast.error('Failed to load leads.'))
      .finally(() => setLoading(false));
  }, [password]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(l.offerName.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q) || l.leadId.toLowerCase().includes(q))) return false;
      }
      if (dateFrom && l.createdAt && new Date(l.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && l.createdAt && new Date(l.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [leads, statusFilter, search, dateFrom, dateTo]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const revenue = filtered.filter(l => l.status === 'Paid' || l.status === 'Approved').reduce((s, l) => s + (l.offerPayout || 0), 0);

  function exportCSV() {
    if (!filtered.length) { toast.error('No leads to export.'); return; }
    const headers = ['Lead ID', 'Offer', 'Payout', 'Status', 'Summary', 'Date', 'Remark'];
    const rows = filtered.map(l => [l.leadId, l.offerName, `₹${l.offerPayout}`, l.status, l.summary,
      l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '', l.publicRemark || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `earninghub-report-${Date.now()}.csv`; document.body.appendChild(a); a.click();
    document.body.removeChild(a); toast.success(`Exported ${filtered.length} leads as CSV 📥`);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `earninghub-leads-${Date.now()}.json`; document.body.appendChild(a); a.click();
    document.body.removeChild(a); toast.success('JSON exported 📦');
  }

  const inputCls = 'px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors';

  if (loading) return <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-14 animate-pulse" />)}</div>;

  return (
    <div className="p-6 space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Filtered Leads', val: filtered.length, color: 'text-primary' },
          { label: 'Revenue (Approved)', val: `₹${revenue.toLocaleString('en-IN')}`, color: 'text-gold' },
          { label: 'Pending', val: filtered.filter(l => l.status === 'Pending').length, color: 'text-amber-400' },
          { label: 'Approved', val: filtered.filter(l => l.status === 'Approved' || l.status === 'Paid').length, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`font-syne font-black text-2xl ${s.color}`}>{s.val}</div>
            <div className="text-muted-foreground text-xs font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-syne font-black text-foreground text-sm mb-4">🔍 Filters & Export</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search leads..." className={`${inputCls} w-52`} />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={inputCls}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={inputCls} />
            <span className="text-muted-foreground text-sm">→</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={inputCls} />
          </div>
          <button onClick={() => { setSearch(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="px-4 py-2 bg-background border border-border text-muted-foreground text-sm rounded-xl hover:border-primary hover:text-primary transition-all font-bold">
            Clear
          </button>
          <div className="flex gap-2 ml-auto">
            <button onClick={exportCSV} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 text-sm font-bold rounded-xl hover:bg-primary/20 transition-all">📥 CSV</button>
            <button onClick={exportJSON} className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 text-sm font-bold rounded-xl hover:bg-green-500/20 transition-all">📦 JSON</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <span className="font-syne font-black text-foreground text-sm">
            {filtered.length} lead{filtered.length !== 1 ? 's' : ''} found
          </span>
          <span className="text-xs text-muted-foreground">Page {page} of {Math.max(totalPages, 1)}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-semibold">No leads match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  {['#', 'Lead ID', 'Offer', 'Payout', 'Summary', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((l, i) => (
                  <tr key={l.id} className="border-b border-border/40 last:border-0 hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3 font-syne font-black text-xs text-primary">{l.leadId}</td>
                    <td className="px-4 py-3"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{l.offerName}</span></td>
                    <td className="px-4 py-3 text-gold font-bold text-sm">₹{l.offerPayout}</td>
                    <td className="px-4 py-3 text-sm text-foreground max-w-[160px] truncate font-medium">{l.summary}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[l.status] || 'border-border text-muted-foreground'}`}>{l.status}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 bg-background border border-border text-sm font-bold rounded-xl hover:border-primary hover:text-primary transition-all disabled:opacity-40">
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${page === p ? 'bg-primary text-white' : 'bg-background border border-border hover:border-primary hover:text-primary'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 bg-background border border-border text-sm font-bold rounded-xl hover:border-primary hover:text-primary transition-all disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
