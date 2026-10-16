'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { fmtDate, fmtINR } from '@/lib/format';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { IndianRupee, Loader2, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { StructureDialog } from './_components/StructureDialog';
import { errorText, type FeeStructure } from './_components/types';

type Confirm = { kind: 'publish' | 'delete'; structure: FeeStructure } | null;

function Collection({ s }: { s: FeeStructure }) {
  const expected = Number(s.expected_paise) || 0;
  const collected = Number(s.collected_paise) || 0;
  const pct = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
  return (
    <div className="min-w-40">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground tabular-nums">{fmtINR(collected)}</span>
        <span className="text-muted-foreground tabular-nums">of {fmtINR(expected)}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{s.settled} of {s.invoices} settled</p>
    </div>
  );
}

export default function FeesPage() {
  const { ready, isAdmin } = useCurrentUser();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [acting, setActing] = useState(false);

  // Only async state updates here, so the first load can run from an effect.
  const fetchStructures = useCallback(() => {
    api.get('/fees/structures')
      .then(r => { setStructures(r.data); setLoadError(''); })
      .catch(e => setLoadError(errorText(e, 'Failed to load fee structures')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (ready && isAdmin) fetchStructures(); }, [ready, isAdmin, fetchStructures]);

  const reload = () => { setLoading(true); fetchStructures(); };

  const openEditor = (s: FeeStructure | null) => {
    setEditing(s);
    setEditorKey(k => k + 1);
    setEditorOpen(true);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, structure } = confirm;
    setActing(true);
    try {
      if (kind === 'publish') {
        const r = await api.post(`/fees/structures/${structure.id}/publish`);
        const created = Number(r.data?.created) || 0;
        toast.success(created ? `Published — ${created} student${created === 1 ? '' : 's'} invoiced and notified` : 'Published — no new students to invoice');
      } else {
        await api.delete(`/fees/structures/${structure.id}`);
        toast.success('Fee structure deleted');
      }
      setConfirm(null);
      reload();
    } catch (e) {
      toast.error(errorText(e, kind === 'publish' ? 'Failed to publish' : 'Failed to delete'));
    }
    setActing(false);
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin) {
    return <EmptyState icon={<IndianRupee size={28} strokeWidth={1.5} />} title="Fees are for administrators" message="Ask an admin if you need fee information." />;
  }

  const columns: Column<FeeStructure>[] = [
    {
      key: 'title',
      header: 'Fee',
      cell: s => (
        <div className="min-w-48">
          {s.published_at ? (
            <Link href={`/dashboard/fees/${s.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{s.title}</Link>
          ) : (
            <span className="font-medium text-foreground">{s.title}</span>
          )}
          <p className="text-xs text-muted-foreground">
            {s.academic_year} · Year {s.year}{s.semester ? ` · Sem ${s.semester}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: s => (
        <div className="tabular-nums">
          <p className="text-foreground">{fmtINR(s.total_paise)}</p>
          {Number(s.late_fee_paise) > 0 && <p className="text-xs text-muted-foreground">+{fmtINR(s.late_fee_paise)} late</p>}
        </div>
      ),
    },
    { key: 'due', header: 'Due', cell: s => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(s.due_date)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: s => !s.is_active
        ? <StatusPill>Inactive</StatusPill>
        : s.published_at ? <StatusPill tone="success">Published</StatusPill> : <StatusPill tone="warning">Draft</StatusPill>,
    },
    { key: 'collection', header: 'Collection', cell: s => (s.published_at ? <Collection s={s} /> : <span className="text-muted-foreground">—</span>) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: s => (
        <div className="flex items-center justify-end gap-1">
          {s.published_at ? (
            <Link href={`/dashboard/fees/${s.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>View</Link>
          ) : (
            <Button size="sm" onClick={() => setConfirm({ kind: 'publish', structure: s })} disabled={!s.is_active} title={s.is_active ? undefined : 'Activate it first'}>
              <Send /> Publish
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => openEditor(s)} aria-label={`Edit ${s.title}`} className="text-muted-foreground">
            <Pencil />
          </Button>
          {!s.published_at && (
            <Button variant="ghost" size="icon-sm" onClick={() => setConfirm({ kind: 'delete', structure: s })} aria-label={`Delete ${s.title}`} className="text-muted-foreground hover:text-destructive">
              <Trash2 />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fees"
        description="Fee structures for each year, and how much has been collected"
        actions={<Button onClick={() => openEditor(null)}><Plus /> New fee</Button>}
      />

      {loadError && <ErrorBanner title="Couldn't load fees" message={loadError} onRetry={reload} />}

      <DataTable
        columns={columns}
        rows={structures}
        rowKey={s => s.id}
        loading={loading}
        empty={
          loadError ? <div /> : (
            <EmptyState
              icon={<IndianRupee size={28} strokeWidth={1.5} />}
              title="No fee structures yet"
              message="Create one, check the amounts, then publish it to invoice that year's students."
              action={<Button onClick={() => openEditor(null)}><Plus /> New fee</Button>}
            />
          )
        }
      />

      <StructureDialog key={editorKey} open={editorOpen} structure={editing} onOpenChange={setEditorOpen} onSaved={reload} />

      <Dialog open={confirm !== null} onOpenChange={v => { if (!v && !acting) setConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirm.kind === 'publish' ? 'Publish this fee?' : 'Delete this fee?'}</DialogTitle>
                <DialogDescription>
                  {confirm.kind === 'publish'
                    ? `Every approved Year ${confirm.structure.year} student gets an invoice for ${fmtINR(confirm.structure.total_paise)} due ${fmtDate(confirm.structure.due_date)}, and a push notification. After this, the amounts can't be changed.`
                    : `“${confirm.structure.title}” hasn't been published, so no student has seen it. This can't be undone.`}
                </DialogDescription>
              </DialogHeader>
              <Card size="sm" className="px-3 text-sm">
                <p className="font-medium text-foreground">{confirm.structure.title}</p>
                <p className="text-xs text-muted-foreground">
                  {confirm.structure.items.map(i => `${i.label} ${fmtINR(i.amount_paise)}`).join(' · ')}
                </p>
              </Card>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={acting}>Cancel</Button>
                <Button variant={confirm.kind === 'delete' ? 'destructive' : 'default'} onClick={runConfirm} disabled={acting}>
                  {acting ? <Loader2 className="animate-spin" /> : null}
                  {confirm.kind === 'publish' ? 'Publish and notify' : 'Delete'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
