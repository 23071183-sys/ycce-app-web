'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { fmtDate, type Tone } from '@/lib/format';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Briefcase, CalendarDays, ExternalLink, Loader2, MapPin, Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { DriveDialog } from './_components/DriveDialog';
import { errorText, type Drive, type DriveStatus } from './_components/types';

const STATUS_TONE: Record<DriveStatus, Tone> = { upcoming: 'accent', ongoing: 'success', finished: 'neutral' };
const FILTERS = ['all', 'upcoming', 'ongoing', 'finished'] as const;
type Filter = (typeof FILTERS)[number];

function DriveCard({ d, canEdit, onEdit, onDelete }: { d: Drive; canEdit: boolean; onEdit: () => void; onDelete: () => void }) {
  const facts = [
    d.package_lpa != null ? `${Number(d.package_lpa)} LPA` : null,
    d.eligibility_cgpa != null ? `CGPA ≥ ${Number(d.eligibility_cgpa)}` : null,
    d.branches?.length ? d.branches.join(', ') : null,
  ].filter(Boolean);
  const hasOutcome = d.selected_count != null || d.selected_names || d.outcome_notes;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{d.company}</p>
              <StatusPill tone={STATUS_TONE[d.status]} className="capitalize">{d.status}</StatusPill>
            </div>
            <p className="text-sm text-muted-foreground">{d.role}</p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${d.company}`} className="text-muted-foreground"><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete ${d.company}`} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
            </div>
          )}
        </div>

        {facts.length > 0 && <p className="text-sm text-foreground">{facts.join(' · ')}</p>}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {d.location && <span className="flex items-center gap-1"><MapPin size={11} />{d.location}</span>}
          {d.apply_deadline && <span>Apply by {fmtDate(d.apply_deadline)}</span>}
          {d.drive_date && (
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {fmtDate(d.drive_date)}{d.end_date && d.end_date !== d.drive_date ? ` – ${fmtDate(d.end_date)}` : ''}
            </span>
          )}
          {d.apply_url && (
            <a href={d.apply_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
              Apply link <ExternalLink size={11} />
            </a>
          )}
        </div>

        {d.rounds?.length > 0 && (
          <ol className="flex flex-wrap gap-1.5">
            {d.rounds.map((r, i) => (
              <li key={i} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {i + 1}. {r.name}{r.date ? ` · ${fmtDate(r.date, { year: false })}` : ''}
              </li>
            ))}
          </ol>
        )}

        {d.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{d.description}</p>}

        {d.status === 'finished' && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="label mb-1.5 flex items-center gap-1.5"><Trophy size={12} /> Outcome</p>
            {hasOutcome ? (
              <div className="space-y-1 text-sm">
                {d.selected_count != null && <p className="text-foreground"><span className="num-display text-xl">{d.selected_count}</span> selected</p>}
                {d.selected_names && <p className="whitespace-pre-line text-muted-foreground">{d.selected_names}</p>}
                {d.outcome_notes && <p className="whitespace-pre-line text-muted-foreground">{d.outcome_notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No outcome recorded yet{canEdit ? ' — edit the drive to add it.' : '.'}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlacementsPage() {
  const { ready, isAdmin, isProfessor } = useCurrentUser();
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Drive | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [deleting, setDeleting] = useState<Drive | null>(null);
  const [busy, setBusy] = useState(false);

  // Only async state updates here, so the first load can run from an effect.
  const fetchDrives = useCallback(() => {
    api.get('/placements')
      .then(r => { setDrives(r.data); setLoadError(''); })
      .catch(e => setLoadError(errorText(e, 'Failed to load placement drives')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (ready) fetchDrives(); }, [ready, fetchDrives]);

  const reload = () => { setLoading(true); fetchDrives(); };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: drives.length, upcoming: 0, ongoing: 0, finished: 0 };
    drives.forEach(d => { c[d.status] += 1; });
    return c;
  }, [drives]);
  const shown = filter === 'all' ? drives : drives.filter(d => d.status === filter);

  const openEditor = (d: Drive | null) => { setEditing(d); setEditorKey(k => k + 1); setEditorOpen(true); };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/placements/${deleting.id}`);
      setDrives(ds => ds.filter(d => d.id !== deleting.id));
      toast.success('Drive deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(errorText(e, 'Failed to delete the drive'));
    }
    setBusy(false);
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!isAdmin && !isProfessor) {
    return <EmptyState icon={<Briefcase size={28} strokeWidth={1.5} />} title="Placements are for staff" />;
  }

  return (
    <div>
      <PageHeader
        title="Placements"
        description={isAdmin ? 'Campus drives students can see and apply to' : 'Campus drives students can see and apply to (view only)'}
        actions={isAdmin && <Button onClick={() => openEditor(null)}><Plus /> New drive</Button>}
      />

      {loadError && <ErrorBanner title="Couldn't load placements" message={loadError} onRetry={reload} />}

      <Tabs value={filter} onValueChange={v => setFilter(v as Filter)} className="mb-4">
        <TabsList>
          {FILTERS.map(f => (
            <TabsTrigger key={f} value={f} className="px-2.5 capitalize">
              {f} <span className="text-xs text-muted-foreground tabular-nums">{counts[f]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : shown.length === 0 ? (
        loadError ? null : (
          <Card>
            <EmptyState
              icon={<Briefcase size={28} strokeWidth={1.5} />}
              title={drives.length === 0 ? 'No placement drives yet' : `No ${filter} drives`}
              message={drives.length === 0 && isAdmin ? 'Add a drive and eligible students are notified.' : undefined}
            />
          </Card>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map(d => (
            <DriveCard key={d.id} d={d} canEdit={isAdmin} onEdit={() => openEditor(d)} onDelete={() => setDeleting(d)} />
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <DriveDialog key={editorKey} open={editorOpen} drive={editing} onOpenChange={setEditorOpen} onSaved={reload} />
          <Dialog open={deleting !== null} onOpenChange={v => { if (!v && !busy) setDeleting(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete this drive?</DialogTitle>
                <DialogDescription>
                  {deleting ? `${deleting.company} — ${deleting.role} disappears from the students' app. This can't be undone.` : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
                <Button variant="destructive" onClick={remove} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : null} Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
