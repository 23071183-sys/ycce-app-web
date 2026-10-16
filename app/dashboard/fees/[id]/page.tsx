'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { fmtDate, fmtINR, type Tone } from '@/lib/format';
import { downloadCsv, slug } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowLeft, Download, IndianRupee, Search } from 'lucide-react';
import { OfflinePaymentDialog, WaiveDialog } from './_components/InvoiceDialogs';
import { errorText, type FeeStructure, type Invoice, type InvoiceStatus } from '../_components/types';

const STATUS_TONE: Record<InvoiceStatus, Tone> = {
  unpaid: 'danger', partial: 'warning', paid: 'success', waived: 'accent', cancelled: 'neutral',
};
const FILTERS = ['all', 'unpaid', 'partial', 'paid', 'waived'] as const;
type Filter = (typeof FILTERS)[number];

const balance = (i: Invoice) => Math.max(0, Number(i.amount_due_paise) - Number(i.amount_paid_paise));
const isOpen = (i: Invoice) => i.status === 'unpaid' || i.status === 'partial';

function exportCsv(structure: FeeStructure, rows: Invoice[]) {
  downloadCsv(
    `${slug(structure.title)}-${structure.academic_year}`,
    ['Roll number', 'Name', 'Email', 'Status', 'Amount due (INR)', 'Paid (INR)', 'Balance (INR)', 'Last paid', 'Waiver note'],
    rows.map(i => [
      i.roll_number, i.name, i.email, i.status,
      (Number(i.amount_due_paise) / 100).toFixed(2),
      (Number(i.amount_paid_paise) / 100).toFixed(2),
      (balance(i) / 100).toFixed(2),
      i.last_paid_at ? fmtDate(i.last_paid_at) : '',
      i.waive_note,
    ]),
  );
}

export default function FeeStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, isAdmin, isSuperAdmin } = useCurrentUser();
  const [structure, setStructure] = useState<FeeStructure | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [waiving, setWaiving] = useState<Invoice | null>(null);

  // Only async state updates here, so the first load can run from an effect.
  const fetchStatus = useCallback(() => {
    api.get(`/fees/structures/${id}/status`)
      .then(r => { setStructure(r.data.structure); setInvoices(r.data.invoices); setLoadError(''); })
      .catch(e => setLoadError(errorText(e, 'Failed to load this fee')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (ready && isAdmin) fetchStatus(); }, [ready, isAdmin, fetchStatus]);

  const reload = () => { setLoading(true); fetchStatus(); };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, unpaid: 0, partial: 0, paid: 0, waived: 0 };
    for (const i of invoices) {
      if (i.status === 'cancelled') continue;
      c.all += 1;
      if (i.status in c) c[i.status as Filter] += 1;
    }
    return c;
  }, [invoices]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(i =>
      i.status !== 'cancelled' &&
      (filter === 'all' || i.status === filter) &&
      (!q || i.name.toLowerCase().includes(q) || (i.roll_number || '').toLowerCase().includes(q) || i.email.toLowerCase().includes(q))
    );
  }, [invoices, filter, search]);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return <EmptyState icon={<IndianRupee size={28} strokeWidth={1.5} />} title="Fees are for administrators" />;
  }

  const expected = Number(structure?.expected_paise) || 0;
  const collected = Number(structure?.collected_paise) || 0;
  const outstanding = invoices.filter(isOpen).reduce((s, i) => s + balance(i), 0);
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const columns: Column<Invoice>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: i => (
        <div className="min-w-40">
          <p className="text-foreground">{i.name}</p>
          <p className="text-xs text-muted-foreground">{i.roll_number || i.email}</p>
        </div>
      ),
    },
    { key: 'due', header: 'Due', align: 'right', cell: i => <span className="tabular-nums">{fmtINR(i.amount_due_paise)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', cell: i => <span className="tabular-nums text-muted-foreground">{fmtINR(i.amount_paid_paise)}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cell: i => isOpen(i) ? <span className="font-medium tabular-nums text-foreground">{fmtINR(balance(i))}</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: i => (
        <div>
          <StatusPill tone={STATUS_TONE[i.status]} className="capitalize">{i.status}</StatusPill>
          {i.status === 'waived' && i.waive_note && <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={i.waive_note}>{i.waive_note}</p>}
        </div>
      ),
    },
    { key: 'last', header: 'Last paid', cell: i => <span className="whitespace-nowrap text-muted-foreground">{i.last_paid_at ? fmtDate(i.last_paid_at) : '—'}</span> },
    ...(isSuperAdmin ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      cell: (i: Invoice) => isOpen(i) ? (
        <div className="flex justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => setPaying(i)}>Record payment</Button>
          <Button variant="ghost" size="sm" onClick={() => setWaiving(i)} className="text-muted-foreground">Waive</Button>
        </div>
      ) : null,
    }] : []),
  ];

  return (
    <div>
      <Link href="/dashboard/fees" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> All fees
      </Link>

      <PageHeader
        eyebrow={structure ? `${structure.academic_year} · Year ${structure.year}${structure.semester ? ` · Sem ${structure.semester}` : ''}` : undefined}
        title={structure?.title || 'Fee'}
        description={structure ? `${fmtINR(structure.total_paise)} per student · due ${fmtDate(structure.due_date)}${Number(structure.late_fee_paise) > 0 ? ` · ${fmtINR(structure.late_fee_paise)} late fee after` : ''}` : undefined}
        actions={structure && (
          <Button variant="outline" onClick={() => exportCsv(structure, shown)} disabled={shown.length === 0}>
            <Download /> Export CSV
          </Button>
        )}
      />

      {loadError && <ErrorBanner title="Couldn't load this fee" message={loadError} onRetry={reload} />}

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Collected" value={loading ? '—' : fmtINR(collected)} hint={loading ? undefined : `${rate}% of ${fmtINR(expected)}`} tone="success" />
        <StatCard label="Outstanding" value={loading ? '—' : fmtINR(outstanding)} hint={`${counts.unpaid + counts.partial} students`} tone={outstanding > 0 ? 'warning' : 'neutral'} />
        <StatCard label="Settled" value={loading ? '—' : `${structure?.settled ?? 0}/${structure?.invoices ?? 0}`} hint="Paid or waived" />
        <StatCard label="Waived" value={loading ? '—' : counts.waived} hint="Closed without payment" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
          <TabsList>
            {FILTERS.map(f => (
              <TabsTrigger key={f} value={f} className="px-2.5 capitalize">
                {f} <span className="text-xs text-muted-foreground tabular-nums">{counts[f]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, roll or email" aria-label="Search students" className="h-9 bg-card pl-8" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={shown}
        rowKey={i => i.id}
        loading={loading}
        empty={loadError ? <div /> : (
          <EmptyState
            title={invoices.length === 0 ? 'No invoices yet' : 'No students match'}
            message={invoices.length === 0 ? 'Publish this fee to invoice the students in its year.' : 'Try another filter or search.'}
          />
        )}
      />

      <OfflinePaymentDialog key={`pay-${paying?.id ?? 0}`} invoice={paying} onClose={() => setPaying(null)} onDone={reload} />
      <WaiveDialog key={`waive-${waiving?.id ?? 0}`} invoice={waiving} onClose={() => setWaiving(null)} onDone={reload} />
    </div>
  );
}
