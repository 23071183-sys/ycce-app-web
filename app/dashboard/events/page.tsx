'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { fmtDate, type Tone } from '@/lib/format';
import { downloadCsv, slug } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CalendarDays, CircleAlert, CircleCheck, Download, Loader2, MapPin, Search, Ticket } from 'lucide-react';

type EventType = 'fest' | 'compufest';
type FestEvent = { id: number; title: string; description: string | null; event_date: string | null; venue: string | null; category?: string | null };
type Counts = { event_id: number; capacity: number | null; registered: number; checked_in: number };
type Registration = {
  id: number; status: 'registered' | 'checked_in'; created_at: string; checked_in_at: string | null;
  user_id: number; name: string; email: string; roll_number: string | null; year: number | null; checked_in_by_name: string | null;
};
type CheckInResult = { tone: Tone; title: string; detail?: string };

const CHECKER_ROLES = ['fest_admin', 'admin', 'super_admin'];
const TYPE_LABEL: Record<EventType, string> = { fest: 'Yash fest', compufest: 'Compufest' };
const FILTERS = ['all', 'registered', 'checked_in'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = { all: 'All', registered: 'Not checked in', checked_in: 'Checked in' };

const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Door check-in by ticket code, for when a QR won't scan.
function CheckInBox({ onCheckedIn }: { onCheckedIn: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = code.trim();
    if (!ticket) return;
    setBusy(true);
    try {
      const r = await api.post('/events/check-in', { ticket_code: ticket });
      setResult({ tone: 'success', title: `${r.data.name} checked in`, detail: [r.data.roll_number, r.data.event_title].filter(Boolean).join(' · ') });
      setCode('');
      onCheckedIn();
    } catch (err) {
      const d = (err as { response?: { data?: { result?: string; name?: string; event_title?: string } } })?.response?.data;
      setResult({
        tone: d?.result === 'already' ? 'warning' : 'danger',
        title: errorText(err, 'Check-in failed'),
        detail: d?.name ? [d.name, d.event_title].filter(Boolean).join(' · ') : undefined,
      });
    }
    setBusy(false);
  };

  return (
    <Card className="mb-6">
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="ticket-code" className="label block">Manual check-in</label>
            <Input id="ticket-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Paste or type the ticket code" autoComplete="off" spellCheck={false} className="font-mono" />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Ticket />} Check in
          </Button>
        </form>
        {result && (
          <div
            role="status"
            className={cn(
              'mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
              result.tone === 'success' ? 'bg-success-soft text-success' : result.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-destructive-soft text-destructive',
            )}
          >
            {result.tone === 'success' ? <CircleCheck size={16} className="mt-0.5 shrink-0" /> : <CircleAlert size={16} className="mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium">{result.title}</p>
              {result.detail && <p className="opacity-80">{result.detail}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const { ready, role } = useCurrentUser();
  const allowed = CHECKER_ROLES.includes(role);

  const [type, setType] = useState<EventType>('fest');
  const [events, setEvents] = useState<FestEvent[]>([]);
  const [counts, setCounts] = useState<Record<number, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [selected, setSelected] = useState<FestEvent | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regsError, setRegsError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  // Only async state updates here, so loads can run from effects.
  const fetchEvents = useCallback((t: EventType) => {
    Promise.all([api.get(`/${t}/events`), api.get(`/events/${t}/counts`)])
      .then(([ev, ct]) => {
        setEvents(ev.data);
        setCounts(Object.fromEntries((ct.data as Counts[]).map(c => [c.event_id, c])));
        setLoadError('');
      })
      .catch(e => setLoadError(errorText(e, 'Failed to load events')))
      .finally(() => setLoading(false));
  }, []);

  const fetchRegs = useCallback((t: EventType, id: number) => {
    api.get(`/events/${t}/${id}/registrations`)
      .then(r => { setRegs(r.data.registrations); setRegsError(''); })
      .catch(e => setRegsError(errorText(e, 'Failed to load registrations')))
      .finally(() => setLoadingRegs(false));
  }, []);

  useEffect(() => { if (ready && allowed) fetchEvents(type); }, [ready, allowed, type, fetchEvents]);

  const switchType = (t: EventType) => {
    setType(t);
    setLoading(true);
    setEvents([]);
    setSelected(null);
    setRegs([]);
  };

  const openEvent = (ev: FestEvent) => {
    setSelected(ev);
    setRegs([]);
    setFilter('all');
    setSearch('');
    setLoadingRegs(true);
    fetchRegs(type, ev.id);
  };

  const refreshAfterCheckIn = () => {
    fetchEvents(type);
    if (selected) fetchRegs(type, selected.id);
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter(r =>
      (filter === 'all' || r.status === filter) &&
      (!q || r.name.toLowerCase().includes(q) || (r.roll_number || '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
    );
  }, [regs, filter, search]);

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!allowed) {
    return <EmptyState icon={<Ticket size={28} strokeWidth={1.5} />} title="Event registrations are for fest admins" />;
  }

  const exportCsv = () => {
    if (!selected) return;
    downloadCsv(
      `${slug(selected.title)}-registrations`,
      ['Name', 'Roll number', 'Year', 'Email', 'Status', 'Registered at', 'Checked in at', 'Checked in by'],
      shown.map(r => [
        r.name, r.roll_number, r.year, r.email, r.status === 'checked_in' ? 'checked in' : 'registered',
        new Date(r.created_at).toLocaleString('en-IN'),
        r.checked_in_at ? new Date(r.checked_in_at).toLocaleString('en-IN') : '',
        r.checked_in_by_name,
      ]),
    );
  };

  const columns: Column<Registration>[] = [
    {
      key: 'name',
      header: 'Student',
      cell: r => (
        <div>
          <p className="text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{[r.roll_number, r.year ? `Year ${r.year}` : null].filter(Boolean).join(' · ') || r.email}</p>
        </div>
      ),
    },
    { key: 'registered', header: 'Registered', cell: r => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(r.created_at)}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: r => r.status === 'checked_in'
        ? (
          <div>
            <StatusPill tone="success">Checked in</StatusPill>
            {r.checked_in_at && (
              <p className="mt-1 text-xs text-muted-foreground">{timeOf(r.checked_in_at)}{r.checked_in_by_name ? ` · ${r.checked_in_by_name}` : ''}</p>
            )}
          </div>
        )
        : <StatusPill>Registered</StatusPill>,
    },
  ];

  const selCounts = selected ? counts[selected.id] : undefined;

  return (
    <div>
      <PageHeader title="Events" description="Registrations and door check-in for fest events" />

      <CheckInBox onCheckedIn={refreshAfterCheckIn} />

      <Tabs value={type} onValueChange={v => switchType(v as EventType)} className="mb-4">
        <TabsList>
          {(['fest', 'compufest'] as const).map(t => <TabsTrigger key={t} value={t} className="px-3">{TYPE_LABEL[t]}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loadError && <ErrorBanner title="Couldn't load events" message={loadError} onRetry={() => { setLoading(true); fetchEvents(type); }} />}

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : events.length === 0 ? (
            loadError ? null : <Card><EmptyState icon={<CalendarDays size={28} strokeWidth={1.5} />} title={`No active ${TYPE_LABEL[type]} events`} /></Card>
          ) : events.map(ev => {
            const c = counts[ev.id];
            const active = selected?.id === ev.id;
            const full = c?.capacity ? c.registered >= c.capacity : false;
            return (
              <button
                key={ev.id}
                onClick={() => openEvent(ev)}
                aria-pressed={active}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:bg-accent',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{ev.title}</p>
                  {full && <StatusPill tone="warning">Full</StatusPill>}
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {ev.event_date && <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDate(ev.event_date)}</span>}
                  {ev.venue && <span className="flex items-center gap-1"><MapPin size={11} />{ev.venue}</span>}
                </p>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  <span className="text-foreground">{c?.registered ?? 0}</span>{c?.capacity ? ` / ${c.capacity}` : ''} registered · {c?.checked_in ?? 0} checked in
                </p>
              </button>
            );
          })}
        </div>

        <div className="min-w-0">
          {!selected ? (
            <Card className="h-full justify-center">
              <EmptyState icon={<Ticket size={28} strokeWidth={1.5} />} title="Select an event" message="Its registrations and check-ins appear here." />
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="label">{TYPE_LABEL[type]}</p>
                  <h2 className="text-lg font-medium text-foreground">{selected.title}</h2>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {selCounts?.registered ?? regs.length}{selCounts?.capacity ? ` of ${selCounts.capacity}` : ''} registered · {selCounts?.checked_in ?? regs.filter(r => r.status === 'checked_in').length} checked in
                  </p>
                </div>
                <Button variant="outline" onClick={exportCsv} disabled={shown.length === 0}><Download /> Export CSV</Button>
              </div>

              {regsError && <ErrorBanner title="Couldn't load registrations" message={regsError} onRetry={() => { setLoadingRegs(true); fetchRegs(type, selected.id); }} />}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
                  <TabsList>
                    {FILTERS.map(f => <TabsTrigger key={f} value={f} className="px-2.5">{FILTER_LABEL[f]}</TabsTrigger>)}
                  </TabsList>
                </Tabs>
                <div className="relative sm:w-64">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, roll or email" aria-label="Search registrations" className="h-9 bg-card pl-8" />
                </div>
              </div>

              <DataTable
                columns={columns}
                rows={shown}
                rowKey={r => r.id}
                loading={loadingRegs}
                empty={<EmptyState title={regs.length === 0 ? 'No registrations yet' : 'No one matches'} />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
