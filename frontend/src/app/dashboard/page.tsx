'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  FileText, CheckCircle, AlertTriangle, Clock,
  Upload, Settings, HelpCircle, LogOut, ArrowRight,
  ChevronUp, ChevronDown, Home, History, LayoutDashboard,
} from 'lucide-react';
import { translations } from '@/lib/i18n/landing';
import type { Contract, Status } from '@/types';
import type { Lang } from '@/lib/i18n/landing';

// ─── Supabase client ───────────────────────────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

type SortField = 'upload_date' | 'employer_name' | 'risk_score';
type SortDir = 'asc' | 'desc';
type FilterType = 'all' | 'completed' | 'critical' | 'processing';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getRiskMeta(score: number, t: typeof translations['en']['dashboard']) {
  if (score >= 71) return { label: t.riskHigh, classes: 'text-red-700 font-bold', badgeClasses: 'bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase' };
  if (score >= 41) return { label: t.riskMedium, classes: 'text-amber-700 font-bold', badgeClasses: 'bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase' };
  return { label: t.riskLow, classes: 'text-emerald-700 font-bold', badgeClasses: 'bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase' };
}

function getStatusMeta(status: Status, t: typeof translations['en']['dashboard']) {
  switch (status) {
    case 'completed': return { label: t.statusCompleted, classes: 'text-emerald-700', icon: <CheckCircle size={13} /> };
    case 'processing': return { label: t.statusProcessing, classes: 'text-amber-600', icon: <Clock size={13} /> };
    case 'queued': return { label: t.statusQueued, classes: 'text-slate-500', icon: <Clock size={13} /> };
    case 'failed': return { label: t.statusFailed, classes: 'text-red-600', icon: <AlertTriangle size={13} /> };
  }
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-xl h-24" />
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 mx-4 my-3 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ t, onUpload }: { t: typeof translations['en']['dashboard']; onUpload: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center gap-5">

      <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
        <FileText size={28} className="text-slate-400" />
      </div>
      <div>
        <h2 className="text-slate-800 font-semibold text-lg mb-1">{t.emptyHeading}</h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">{t.emptyDesc}</p>
      </div>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 px-5 rounded-lg transition-colors"
      >
        <Upload size={15} /> {t.emptyCta}
      </button>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('upload_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // ── Lang detect ──────────────────────────────────────────────────────────────
  // REPLACE with
const [lang, setLang] = useState<Lang>(() => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('lang');
  return (stored === 'en' || stored === 'ne') ? stored : 'en';
});

useEffect(() => {
  const sync = () => {
    const stored = localStorage.getItem('lang');
    setLang(stored === 'ne' ? 'ne' : 'en');
  };
  window.addEventListener('langchange', sync);
  return () => window.removeEventListener('langchange', sync);
}, []);

const t = translations[lang].dashboard;

  // ── Auth + fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }
      setUserEmail(user.email ?? null);
      setUserId(user.id);

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false });

      if (!error && data) setContracts(data as Contract[]);
      setIsLoading(false);
    };
    init();
  }, [router]);

  // ── Realtime subscription ────────────────────────────────────────────────────
  // NOTE: Ensure Row Level Security (RLS) is enabled on contracts table in Supabase dashboard
  // for filter:`user_id=eq.${userId}` to work correctly — otherwise filter is silently ignored
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('dashboard-realtime-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contracts',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setContracts(prev => [payload.new as Contract, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setContracts(prev => prev.map(c =>
            c.id === (payload.new as Contract).id ? payload.new as Contract : c
          ));
        } else if (payload.eventType === 'DELETE') {
          setContracts(prev => prev.filter(c => c.id !== (payload.old as Contract).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  // ── Retry — reset to queued via Supabase direct mutation ─────────────────────
  // Backend FastAPI watch loop polls for 'queued' status to restart pipeline
  // If retry feels slow, verify FastAPI polling interval is ≤10s
  const handleRetry = useCallback(async (contractId: string) => {
    setRetryingIds(prev => new Set(prev).add(contractId));
    await supabase
      .from('contracts')
      .update({ status: 'queued' })
      .eq('id', contractId);
    setRetryingIds(prev => { const s = new Set(prev); s.delete(contractId); return s; });
  }, []);

  // ── Stat derivations ─────────────────────────────────────────────────────────
  const totalContracts = contracts.length;
  const analysed = contracts.filter(c => c.status === 'completed').length;
  const criticalFlags = contracts.reduce((sum, c) => sum + (c.critical_flags_count ?? 0), 0);
  const processingCount = contracts.filter(c => c.status === 'processing' || c.status === 'queued').length;

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = contracts.filter(c => {
    if (activeFilter === 'completed') return c.status === 'completed';
    if (activeFilter === 'processing') return c.status === 'processing' || c.status === 'queued';
    if (activeFilter === 'critical') return (c.critical_flags_count ?? 0) > 0;
    return true;
  });

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = a[sortField] ?? '';
    let bv: string | number = b[sortField] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // ── Pagination ───────────────────────────────────────────────────────────────
  // TODO: Migrate to server-side limit/offset when dataset exceeds 100+ records
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handleFilterCard = (f: FilterType) => {
    setActiveFilter(prev => prev === f ? 'all' : f);
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-slate-600" />
      : <ChevronDown size={12} className="text-slate-600" />;
  };

  // ── Stat cards config ────────────────────────────────────────────────────────
  const statCards = [
    { key: 'all' as FilterType, icon: <FileText size={18} />, label: t.totalContracts, value: totalContracts, sub: t.totalSub },
    { key: 'completed' as FilterType, icon: <CheckCircle size={18} />, label: t.analysed, value: analysed, sub: t.analysedSub },
    { key: 'critical' as FilterType, icon: <AlertTriangle size={18} />, label: t.criticalFlags, value: criticalFlags, sub: t.criticalSub },
    { key: 'processing' as FilterType, icon: <Clock size={18} />, label: t.processing, value: processingCount, sub: t.processingSub },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">

      

      {/* ── Main ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 pb-24 md:pb-10">

        {isLoading ? <Skeleton /> : (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map(card => {
                const isActive = activeFilter === card.key;
                return (
                  <button
                    key={card.key}
                    onClick={() => handleFilterCard(card.key)}
                    className={`bg-white dark:bg-slate-900 border rounded-xl shadow-sm p-5 flex flex-col gap-3 text-left transition-all hover:shadow-md ${
                      isActive ? 'border-slate-900 dark:border-slate-100 ring-1 ring-slate-900 dark:ring-slate-100' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="text-slate-400 bg-slate-50 border border-slate-100 p-2 rounded-lg w-fit">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                      <p className="text-sm text-slate-600 font-medium">{card.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear filter */}
            {activeFilter !== 'all' && (
              <div className="mb-4 flex">
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 bg-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t.clearFilter} ×
                </button>
              </div>
            )}

            {/* ── Empty or table ── */}
            {contracts.length === 0 ? (
              <EmptyState t={t} onUpload={() => router.push('/upload')} />
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">

                {/* Table header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-slate-800 font-semibold text-base">{t.contractRecords}</h2>
                  <button
                    onClick={() => router.push('/history')}
                    className="text-slate-500 hover:text-slate-900 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {t.viewAll} <ArrowRight size={12} />
                  </button>
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">{t.colWorker}</th>
                        <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">{t.colEmployer}</th>
                        <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">{t.colCountry}</th>
                        <th className="px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold text-left">
                          <button onClick={() => handleSort('upload_date')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            {t.colDate} <SortIcon field="upload_date" />
                          </button>
                        </th>
                        <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">{t.colStatus}</th>
                        <th className="px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold text-left">
                          <button onClick={() => handleSort('risk_score')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            {t.colRisk} <SortIcon field="risk_score" />
                          </button>
                        </th>
                        <th className="text-left px-5 py-3 text-slate-400 text-xs uppercase tracking-widest font-semibold">{t.colFlags}</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((contract, i) => {
                       const statusMeta = getStatusMeta(contract.status, t) ?? { label: contract.status, classes: 'text-slate-400', icon: null };
                        const riskMeta = contract.risk_score > 0 ? getRiskMeta(contract.risk_score, t) : null;
                        const isLast = i === paginated.length - 1;

                        return (
                          <tr key={contract.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${!isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                            <td className="px-5 py-4">
                              <p className="text-slate-800 font-medium text-sm">
                                {contract.worker_name || t.notSpecified}
                              </p>
                              <p className="text-slate-400 text-xs font-mono">{contract.id?.slice(0, 8) ?? '—'}…</p>
                            </td>
                            <td className="px-5 py-4 text-slate-600 text-sm truncate max-w-[140px]">
                              {contract.employer_name || t.notSpecified}
                            </td>
                            <td className="px-5 py-4 text-slate-600 text-sm">
                              {contract.country || t.notSpecified}
                            </td>
                            <td className="px-5 py-4 text-slate-500 text-sm tabular-nums">
                              {contract.upload_date?.slice(0, 10) ?? '—'}
                            </td>
                            <td className="px-5 py-4">
                              <div className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.classes}`}>
                                {statusMeta.icon} {statusMeta.label}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {contract.risk_score > 0 && riskMeta ? (
                                <span className={riskMeta.classes}>{contract.risk_score}</span>
                              ) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              {(contract.critical_flags_count ?? 0) > 0 ? (
                                <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">
                                  {contract.critical_flags_count} critical
                                </span>
                              ) : contract.status === 'completed' ? (
                                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase">safe</span>
                              ) : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {contract.status === 'completed' && (
                                <button
                                  onClick={() => router.push(`/report/${contract.id}`)}
                                  className="text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1 ml-auto transition-colors"
                                >
                                  {t.actionView} <ArrowRight size={11} />
                                </button>
                              )}
                              {contract.status === 'failed' && (
                                <button
                                  onClick={() => handleRetry(contract.id)}
                                  disabled={retryingIds.has(contract.id)}
                                  className="text-amber-600 hover:text-amber-800 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  {retryingIds.has(contract.id) ? '…' : t.actionRetry}
                                </button>
                              )}
                              {(contract.status === 'processing' || contract.status === 'queued') && (
                                <span className="text-slate-400 text-xs">{statusMeta.label}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile cards ── */}
                <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                  {paginated.map(contract => {
                    const statusMeta = getStatusMeta(contract.status, t) ?? { label: contract.status, classes: 'text-slate-400', icon: null };
                    const riskMeta = contract.risk_score > 0 ? getRiskMeta(contract.risk_score, t) : null;

                    return (
                      <div key={contract.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 mx-3 my-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-slate-800 font-medium text-sm">
                              {contract.worker_name || t.notSpecified}
                            </p>
                            <p className="text-slate-500 text-xs mt-0.5">
                              {contract.employer_name || t.notSpecified}
                            </p>
                          </div>
                          {contract.risk_score > 0 && riskMeta && (
                            <span className={`text-xl font-bold shrink-0 ${riskMeta.classes}`}>
                              {contract.risk_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${statusMeta.classes}`}>
                            {statusMeta.icon} {statusMeta.label}
                          </div>
                          <span className="text-slate-400 text-xs">{contract.upload_date?.slice(0, 10)}</span>
                        </div>
                        {(contract.critical_flags_count ?? 0) > 0 && (
                          <span className="bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase inline-block">
                            {contract.critical_flags_count} critical
                          </span>
                        )}
                        <div className="flex gap-2">
                          {contract.status === 'completed' && (
                            <button
                              onClick={() => router.push(`/report/${contract.id}`)}
                              className="flex items-center gap-1 text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {t.actionView} <ArrowRight size={11} />
                            </button>
                          )}
                          {contract.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(contract.id)}
                              disabled={retryingIds.has(contract.id)}
                              className="text-amber-600 border border-amber-200 hover:bg-amber-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {retryingIds.has(contract.id) ? '…' : t.actionRetry}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Pagination ── */}
                {sorted.length > PAGE_SIZE && (
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {t.showing} {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} {t.of} {sorted.length} {t.records}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        ←
                      </button>
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer nav (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 md:hidden">
        {[
          { href: '/', icon: <Home size={20} />, label: 'Home' },
          { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
          { href: '/upload', icon: <Upload size={20} />, label: 'Upload' },
          { href: '/history', icon: <History size={20} />, label: 'History' },
        ].map(item => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}