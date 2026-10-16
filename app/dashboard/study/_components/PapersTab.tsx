'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { ExternalLink, FileText, ListChecks, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  EXAM_TYPES, currentAcademicYear, errorText, examLabel, statusOf, subjectLabel,
  type Paper, type Question, type Subject,
} from './types';

const POLL_MS = 5000;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/*';
// A fresh upload sits in "pending" for a moment before reading starts.
const RECENT_MS = 2 * 60 * 1000;

const busy = (p: Paper) =>
  p.extract_status === 'processing' ||
  (p.extract_status === 'pending' && Date.now() - new Date(p.created_at).getTime() < RECENT_MS);

function ExtractStatus({ p }: { p: Paper }) {
  if (p.extract_status === 'done') return <StatusPill tone="success">{p.question_count} question{p.question_count === 1 ? '' : 's'}</StatusPill>;
  if (p.extract_status === 'processing') {
    return <StatusPill tone="accent"><Loader2 size={11} className="mr-1 animate-spin" />Reading</StatusPill>;
  }
  if (p.extract_status === 'failed') {
    return (
      <div className="max-w-56">
        <StatusPill tone="danger">Failed</StatusPill>
        {p.extract_error && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={p.extract_error}>{p.extract_error}</p>}
      </div>
    );
  }
  return <StatusPill>Queued</StatusPill>;
}

function UploadDialog({
  open, subjects, defaultSubjectId, onOpenChange, onUploaded,
}: {
  open: boolean; subjects: Subject[]; defaultSubjectId: string;
  onOpenChange: (open: boolean) => void; onUploaded: () => void;
}) {
  // The parent remounts this each time it opens (key), so the form starts fresh.
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [examType, setExamType] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.type.startsWith('image/')) { setError('Upload a PDF or a photo of the paper'); return; }
    if (f.size > MAX_BYTES) { setError('That file is over 20 MB'); return; }
    setError('');
    setFile(f);
  };

  const save = async () => {
    if (!subjectId) { setError('Choose the subject'); return; }
    if (!examType) { setError('Choose the exam'); return; }
    if (!file) { setError('Attach the paper (PDF or photo)'); return; }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('subject_id', subjectId);
      fd.append('exam_type', examType);
      if (academicYear.trim()) fd.append('academic_year', academicYear.trim());
      await api.post('/study/papers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Paper uploaded — its questions are being read');
      onUploaded();
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e, 'Failed to upload the paper'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload past paper</DialogTitle>
          <DialogDescription>The questions are read out automatically and feed the students&apos; quizzes and flashcards.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Subject" htmlFor="paper-subject">
            <SelectField id="paper-subject" value={subjectId} onValueChange={setSubjectId} placeholder="Select subject…"
              options={subjects.map(s => ({ value: String(s.id), label: subjectLabel(s) }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Exam" htmlFor="paper-exam">
              <SelectField id="paper-exam" value={examType} onValueChange={setExamType} placeholder="Select…" options={EXAM_TYPES} />
            </FormField>
            <FormField label="Academic year" htmlFor="paper-ay">
              <Input id="paper-ay" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2026-27" />
            </FormField>
          </div>
          <FormField label="File" hint="PDF or image, up to 20 MB">
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input px-3 py-3 transition-colors hover:bg-accent">
              <FileText size={15} className="shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-muted-foreground">{file ? file.name : 'Choose a PDF or photo of the paper'}</span>
              <input type="file" accept={ACCEPT} className="hidden" onChange={e => pick(e.target.files?.[0])} />
            </label>
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin" /> : <Upload />}
            {saving ? 'Uploading...' : 'Upload paper'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionsDialog({ paper, onClose }: { paper: Paper | null; onClose: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paper) return;
    let cancelled = false;
    api.get(`/study/papers/${paper.id}/questions`)
      .then(r => { if (!cancelled) setQuestions(r.data); })
      .catch(e => { if (!cancelled) setError(errorText(e, 'Failed to load the questions')); });
    return () => { cancelled = true; };
  }, [paper]);

  return (
    <Dialog open={paper !== null} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        {paper && (
          <>
            <DialogHeader>
              <DialogTitle>{paper.subject_name} — {examLabel(paper.exam_type)}{paper.academic_year ? ` ${paper.academic_year}` : ''}</DialogTitle>
              <DialogDescription>Questions read from the paper.</DialogDescription>
            </DialogHeader>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : questions === null ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : questions.length === 0 ? (
              <EmptyState title="No questions found" />
            ) : (
              <ol className="space-y-3">
                {questions.map((q, i) => (
                  <li key={q.id} className="rounded-lg border border-border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="label">Q{i + 1}{q.topic ? ` · ${q.topic}` : ''}</span>
                      {q.marks != null && <span className="text-xs text-muted-foreground tabular-nums">{Number(q.marks)} marks</span>}
                    </div>
                    <p className="whitespace-pre-line text-sm text-foreground">{q.question}</p>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Past papers: upload, watch them being read, look at or retry the result.
export function PapersTab({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [viewing, setViewing] = useState<Paper | null>(null);
  const [deleting, setDeleting] = useState<Paper | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const subjectRef = useRef(subjectId);
  useEffect(() => { subjectRef.current = subjectId; }, [subjectId]);

  // Only async state updates here, so loads can run from effects and timers.
  const fetchPapers = useCallback((sid: string) => {
    api.get('/study/papers', { params: { subject_id: sid || undefined } })
      .then(r => { if (subjectRef.current === sid) { setPapers(r.data); setLoadError(''); } })
      .catch(e => setLoadError(errorText(e, 'Failed to load papers')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPapers(subjectId); }, [subjectId, fetchPapers]);

  // Keep checking while any paper is still being read.
  const anyBusy = papers.some(busy);
  useEffect(() => {
    if (!anyBusy) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') fetchPapers(subjectRef.current); }, POLL_MS);
    return () => clearInterval(t);
  }, [anyBusy, fetchPapers]);

  const changeSubject = (v: string) => { setLoading(true); setSubjectId(v); };

  const retry = async (p: Paper) => {
    setRetrying(p.id);
    try {
      // A 503 here means the AI service is off, not that the server is waking.
      await api.post(`/study/papers/${p.id}/extract`, undefined, { skipWakeRetry: true });
      setPapers(ps => ps.map(x => (x.id === p.id ? { ...x, extract_status: 'processing', extract_error: null } : x)));
    } catch (e) {
      if (statusOf(e) === 503) toast.info('Reading papers needs the AI service, which isn’t available right now. The paper is saved — try again later.');
      else toast.error(errorText(e, 'Failed to retry'));
    }
    setRetrying(null);
  };

  const remove = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.delete(`/study/papers/${deleting.id}`);
      setPapers(ps => ps.filter(p => p.id !== deleting.id));
      toast.success('Paper deleted');
      setDeleting(null);
    } catch (e) {
      toast.error(errorText(e, 'Failed to delete the paper'));
    }
    setDeletingBusy(false);
  };

  const columns: Column<Paper>[] = [
    {
      key: 'paper',
      header: 'Paper',
      cell: p => (
        <div className="min-w-44">
          <p className="text-foreground">{p.subject_name} <span className="text-muted-foreground">· {examLabel(p.exam_type)}</span></p>
          <p className="text-xs text-muted-foreground">{[p.code, `Year ${p.year}`, p.academic_year].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Questions', cell: p => <ExtractStatus p={p} /> },
    {
      key: 'uploaded',
      header: 'Uploaded',
      cell: p => (
        <div className="whitespace-nowrap text-muted-foreground">
          <p>{fmtDate(p.created_at)}</p>
          {p.uploaded_by_name && <p className="text-xs">{p.uploaded_by_name}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: p => (
        <div className="flex items-center justify-end gap-1">
          {p.extract_status === 'done' && p.question_count > 0 && (
            <Button variant="outline" size="sm" onClick={() => setViewing(p)}><ListChecks /> Questions</Button>
          )}
          {(p.extract_status === 'failed' || (p.extract_status === 'pending' && !busy(p))) && (
            <Button variant="outline" size="sm" onClick={() => retry(p)} disabled={retrying === p.id}>
              {retrying === p.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Retry
            </Button>
          )}
          <a href={p.file_url} target="_blank" rel="noreferrer" aria-label="Open the file" title="Open the file"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLink size={14} />
          </a>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(p)} aria-label="Delete paper" className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <FormField label="Subject" htmlFor="papers-filter" className="sm:w-80">
          <SelectField
            id="papers-filter"
            value={subjectId}
            onValueChange={changeSubject}
            options={[{ value: '', label: 'All subjects' }, ...subjects.map(s => ({ value: String(s.id), label: subjectLabel(s) }))]}
          />
        </FormField>
        <Button onClick={() => { setUploadKey(k => k + 1); setUploadOpen(true); }} disabled={subjects.length === 0}>
          <Upload /> Upload paper
        </Button>
      </div>

      {loadError && <ErrorBanner title="Couldn't load papers" message={loadError} onRetry={() => { setLoading(true); fetchPapers(subjectId); }} />}

      <DataTable
        columns={columns}
        rows={papers}
        rowKey={p => p.id}
        loading={loading}
        empty={loadError ? <div /> : (
          <EmptyState icon={<FileText size={28} strokeWidth={1.5} />} title="No papers yet" message="Upload an MSE, RE-MSE or ESE paper to build the question bank." />
        )}
      />

      <UploadDialog key={uploadKey} open={uploadOpen} subjects={subjects} defaultSubjectId={subjectId}
        onOpenChange={setUploadOpen} onUploaded={() => fetchPapers(subjectRef.current)} />
      <QuestionsDialog key={viewing?.id ?? 0} paper={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this paper?"
        description={deleting ? `${deleting.subject_name} ${examLabel(deleting.exam_type)} and the questions read from it are removed.` : undefined}
        busy={deletingBusy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
