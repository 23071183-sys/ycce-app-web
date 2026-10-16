'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { ArrowLeft, CircleCheck, Loader2, Maximize, Minimize, QrCode, Square } from 'lucide-react';

type Subject = { id: number; name: string; code?: string; year: number };
type Scan = { id: number; name: string; roll_number: string | null; scanned_at: string };
type Detail = { id: number; subject_id: number; subject_name: string; year: number; date: string; open: boolean; scans: Scan[]; class_size: number };
type Summary = { present: number; marked_absent: number; subject: string };

const TOKEN_POLL_MS = 2000;
const DETAIL_POLL_MS = 5000;

const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;
const visible = () => document.visibilityState === 'visible';
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

// The session id rides in the URL so a refreshed projector picks up where it was.
const setSessionInUrl = (id: number | null) => {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('session', String(id)); else url.searchParams.delete('session');
  window.history.replaceState(null, '', url);
};

export default function QrAttendancePage() {
  const { ready, isAdmin, isProfessor } = useCurrentUser();
  const allowed = isAdmin || isProfessor;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsError, setSubjectsError] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [starting, setStarting] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [qr, setQr] = useState('');
  const [scanned, setScanned] = useState(0);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!ready || !allowed) return;
    api.get(isAdmin ? '/admin/subjects' : '/subjects/my-subjects')
      .then(r => setSubjects(r.data))
      .catch(e => setSubjectsError(errorText(e, 'Failed to load subjects')));
  }, [ready, allowed, isAdmin]);

  // Resume a session named in the URL, if it's still open.
  useEffect(() => {
    if (!ready || !allowed) return;
    const id = Number(new URLSearchParams(window.location.search).get('session'));
    if (!id) return;
    api.get(`/attendance/sessions/${id}`)
      .then(r => { if (r.data.open) { setDetail(r.data); setSessionId(id); } else setSessionInUrl(null); })
      .catch(() => setSessionInUrl(null));
  }, [ready, allowed]);

  const endedElsewhere = useCallback(() => {
    toast.info('This session has ended');
    setSessionId(null);
    setQr('');
    setSessionInUrl(null);
  }, []);

  // The code changes every 10 s; ask for it every 2 s so the screen is never stale.
  useEffect(() => {
    if (sessionId === null) return;
    let stopped = false;
    const poll = () => {
      if (!visible()) return;
      api.get(`/attendance/sessions/${sessionId}/token`)
        .then(r => { if (!stopped) { setQr(r.data.qr); setScanned(Number(r.data.scanned) || 0); } })
        .catch(e => { if (!stopped && statusOf(e) === 409) { stopped = true; endedElsewhere(); } });
    };
    poll();
    const t = setInterval(poll, TOKEN_POLL_MS);
    return () => { stopped = true; clearInterval(t); };
  }, [sessionId, endedElsewhere]);

  // Who has scanned in so far.
  useEffect(() => {
    if (sessionId === null) return;
    let stopped = false;
    const poll = () => {
      if (!visible()) return;
      api.get(`/attendance/sessions/${sessionId}`)
        .then(r => { if (!stopped) setDetail(r.data); })
        .catch(err => console.warn('Session detail poll failed:', err?.message));
    };
    poll();
    const t = setInterval(poll, DETAIL_POLL_MS);
    return () => { stopped = true; clearInterval(t); };
  }, [sessionId]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.().catch(() => toast.error('Full screen is not available in this browser'));
  };

  const start = async () => {
    if (!subjectId) return;
    setStarting(true);
    try {
      const r = await api.post('/attendance/sessions', { subject_id: Number(subjectId) });
      const id = Number(r.data.id);
      if (r.data.reused) toast.info('Picked up the session already open for this subject');
      setSummary(null);
      setDetail(null);
      setQr('');
      setScanned(0);
      setSessionId(id);
      setSessionInUrl(id);
    } catch (e) {
      toast.error(errorText(e, 'Failed to start the session'));
    }
    setStarting(false);
  };

  const close = async () => {
    if (sessionId === null) return;
    setClosing(true);
    try {
      const r = await api.post(`/attendance/sessions/${sessionId}/close`);
      if (document.fullscreenElement) document.exitFullscreen();
      setSummary({ present: Number(r.data.present) || 0, marked_absent: Number(r.data.marked_absent) || 0, subject: detail?.subject_name || '' });
      setSessionId(null);
      setQr('');
      setSessionInUrl(null);
      setConfirmClose(false);
    } catch (e) {
      toast.error(errorText(e, 'Failed to close the session'));
    }
    setClosing(false);
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;
  if (!allowed) return <EmptyState icon={<QrCode size={28} strokeWidth={1.5} />} title="QR attendance is for teaching staff" />;

  const subjectLabel = (s: Subject) => `${s.code ? `${s.code} — ` : ''}${s.name} (Year ${s.year})`;
  const scans = detail?.scans ?? [];

  return (
    <div>
      <Link href="/dashboard/attendance" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Attendance
      </Link>
      <PageHeader
        title="QR Attendance"
        description="Students scan the code on this screen from the app. The code changes every 10 seconds."
      />

      {subjectsError && <ErrorBanner title="Couldn't load subjects" message={subjectsError} />}

      {summary && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CircleCheck className="mt-0.5 text-success" />
              <div>
                <p className="font-medium text-foreground">Session closed{summary.subject ? ` — ${summary.subject}` : ''}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="text-success tabular-nums">{summary.present}</span> present by scan ·{' '}
                  <span className="text-destructive tabular-nums">{summary.marked_absent}</span> marked absent.
                  Students already marked for today were left as they were.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setSummary(null)}>Done</Button>
          </CardContent>
        </Card>
      )}

      {sessionId === null ? (
        <Card className="max-w-xl">
          <CardContent className="space-y-4">
            <FormField label="Subject" htmlFor="qr-subject">
              <SelectField
                id="qr-subject"
                value={subjectId}
                onValueChange={setSubjectId}
                placeholder="Select subject…"
                options={subjects.map(s => ({ value: String(s.id), label: subjectLabel(s) }))}
              />
            </FormField>
            <Button onClick={start} disabled={!subjectId || starting}>
              {starting ? <Loader2 className="animate-spin" /> : <QrCode />} Start session
            </Button>
            <p className="text-xs text-muted-foreground">
              When you close the session, every student in that year who didn&apos;t scan is marked absent for today.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div
            ref={stageRef}
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-10"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div>
                <p className="label">{detail ? `Year ${detail.year}` : 'Session'}</p>
                <p className="text-lg font-medium text-foreground">{detail?.subject_name || '…'}</p>
              </div>
              <div className="text-right">
                <p className="num-display text-5xl text-foreground">{scanned}</p>
                <p className="label">{detail ? `of ${detail.class_size} scanned` : 'scanned'}</p>
              </div>
            </div>
            <div className="w-full max-w-[min(70vh,32rem)] [:fullscreen_&]:max-w-[min(78vh,48rem)]">
              {qr ? (
                <QRCodeSVG
                  value={qr}
                  size={512}
                  level="M"
                  marginSize={2}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  title="Attendance code"
                  className="h-auto w-full rounded-lg"
                />
              ) : (
                <Skeleton className="aspect-square w-full rounded-lg" />
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={toggleFullscreen}>
                {fullscreen ? <Minimize /> : <Maximize />} {fullscreen ? 'Exit full screen' : 'Full screen'}
              </Button>
              <Button variant="destructive" onClick={() => setConfirmClose(true)}>
                <Square /> Close session
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <StatCard
              label="Present so far"
              value={scanned}
              hint={detail ? `${Math.max(0, detail.class_size - scanned)} yet to scan` : undefined}
              tone="success"
            />
            <Card className="gap-0 py-0">
              <CardContent className="px-0">
                <p className="label border-b border-border px-4 py-3">Scanned in</p>
                {scans.length === 0 ? (
                  <EmptyState className="py-10" title="No scans yet" message="Names appear here as students scan." />
                ) : (
                  <ol className="max-h-[50vh] divide-y divide-border overflow-y-auto">
                    {[...scans].reverse().map(s => (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate text-foreground">{s.name}</span>
                          {s.roll_number && <span className="block text-xs text-muted-foreground">{s.roll_number}</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{timeOf(s.scanned_at)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={confirmClose} onOpenChange={v => { if (!closing) setConfirmClose(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close this session?</DialogTitle>
            <DialogDescription>
              The code stops working, and {detail ? `the ${Math.max(0, detail.class_size - scanned)} Year ${detail.year} students who haven't scanned` : "students who haven't scanned"} are marked absent for today unless they already have a mark.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClose(false)} disabled={closing}>Keep open</Button>
            <Button variant="destructive" onClick={close} disabled={closing}>
              {closing ? <Loader2 className="animate-spin" /> : null} Close and mark absent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
