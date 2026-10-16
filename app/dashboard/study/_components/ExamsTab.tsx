'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { fmtDate, toDateInput } from '@/lib/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { EXAM_TYPES, currentAcademicYear, errorText, examLabel, subjectLabel, type Exam, type Subject } from './types';

const YEARS = ['all', '1', '2', '3', '4'] as const;
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

// Add or move an exam. The server keeps one row per subject, exam and
// academic year, so editing locks those three and changes only the when/where.
function ExamDialog({
  open, exam, subjects, onOpenChange, onSaved,
}: {
  open: boolean; exam: Exam | null; subjects: Subject[];
  onOpenChange: (open: boolean) => void; onSaved: () => void;
}) {
  // The parent remounts this per exam (key), so the form starts fresh.
  const [subjectId, setSubjectId] = useState(exam ? String(exam.subject_id) : '');
  const [examType, setExamType] = useState<string>(exam?.exam_type ?? '');
  const [academicYear, setAcademicYear] = useState(exam ? exam.academic_year ?? '' : currentAcademicYear());
  const [date, setDate] = useState(toDateInput(exam?.exam_date));
  const [time, setTime] = useState(hhmm(exam?.start_time ?? null));
  const [room, setRoom] = useState(exam?.room ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = !!exam;

  const save = async () => {
    if (!subjectId) { setError('Choose the subject'); return; }
    if (!examType) { setError('Choose the exam'); return; }
    if (!date) { setError('Pick the exam date'); return; }
    setError('');
    setSaving(true);
    try {
      await api.put('/study/exams', {
        subject_id: Number(subjectId),
        exam_type: examType,
        exam_date: date,
        start_time: time || null,
        room: room.trim() || null,
        academic_year: academicYear.trim(),
      });
      toast.success(editing ? 'Exam updated' : 'Exam added');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e, 'Failed to save the exam'));
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit exam' : 'Add exam'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Change the date, time or room.' : 'Adding the same subject, exam and academic year again replaces the earlier entry.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Subject" htmlFor="exam-subject">
            <SelectField id="exam-subject" value={subjectId} onValueChange={setSubjectId} placeholder="Select subject…" disabled={editing}
              options={subjects.map(s => ({ value: String(s.id), label: subjectLabel(s) }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Exam" htmlFor="exam-type">
              <SelectField id="exam-type" value={examType} onValueChange={setExamType} placeholder="Select…" options={EXAM_TYPES} disabled={editing} />
            </FormField>
            <FormField label="Academic year" htmlFor="exam-ay">
              <Input id="exam-ay" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2026-27" disabled={editing} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date" htmlFor="exam-date">
              <Input id="exam-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
            <FormField label="Start time (optional)" htmlFor="exam-time">
              <Input id="exam-time" type="time" value={time} onChange={e => setTime(e.target.value)} className="dark:[color-scheme:dark]" />
            </FormField>
          </div>
          <FormField label="Room (optional)" htmlFor="exam-room">
            <Input id="exam-room" value={room} onChange={e => setRoom(e.target.value)} maxLength={60} placeholder="e.g. CT-301" />
          </FormField>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add exam'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// The exam timetable. Admins edit it; everyone else reads it.
export function ExamsTab({ subjects, canEdit }: { subjects: Subject[]; canEdit: boolean }) {
  const [year, setYear] = useState<(typeof YEARS)[number]>('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [deleting, setDeleting] = useState<Exam | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Only async state updates here, so the load can run from an effect.
  const fetchExams = useCallback((y: string) => {
    api.get('/study/exams', { params: { year: y === 'all' ? undefined : y, all: 1 } })
      .then(r => { setExams(r.data); setLoadError(''); })
      .catch(e => setLoadError(errorText(e, 'Failed to load the exam schedule')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchExams(year); }, [year, fetchExams]);

  const reload = () => { setLoading(true); fetchExams(year); };
  const openEditor = (e: Exam | null) => { setEditing(e); setEditorKey(k => k + 1); setEditorOpen(true); };

  const remove = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.delete(`/study/exams/${deleting.id}`);
      setExams(es => es.filter(e => e.id !== deleting.id));
      toast.success('Exam removed');
      setDeleting(null);
    } catch (e) {
      toast.error(errorText(e, 'Failed to remove the exam'));
    }
    setDeletingBusy(false);
  };

  const today = toDateInput(new Date());

  const columns: Column<Exam>[] = [
    {
      key: 'date',
      header: 'Date',
      cell: e => (
        <div className="whitespace-nowrap">
          <p className="text-foreground">{fmtDate(e.exam_date)}</p>
          <p className="text-xs text-muted-foreground">{hhmm(e.start_time) || 'Time TBA'}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: e => (
        <div className="min-w-40">
          <p className="text-foreground">{e.subject_name}</p>
          <p className="text-xs text-muted-foreground">{[e.code, `Year ${e.year}`].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    {
      key: 'exam',
      header: 'Exam',
      cell: e => (
        <div className="flex items-center gap-2">
          <span className="text-foreground">{examLabel(e.exam_type)}</span>
          {toDateInput(e.exam_date) < today && <StatusPill>Past</StatusPill>}
        </div>
      ),
    },
    { key: 'room', header: 'Room', cell: e => <span className="text-muted-foreground">{e.room || '—'}</span> },
    { key: 'ay', header: 'Academic year', cell: e => <span className="text-muted-foreground">{e.academic_year || '—'}</span> },
    ...(canEdit ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      cell: (e: Exam) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEditor(e)} aria-label="Edit exam" className="text-muted-foreground"><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(e)} aria-label="Remove exam" className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={year} onValueChange={v => { setLoading(true); setYear(v as (typeof YEARS)[number]); }}>
          <TabsList>
            {YEARS.map(y => <TabsTrigger key={y} value={y} className="px-2.5">{y === 'all' ? 'All years' : `Year ${y}`}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {canEdit && <Button onClick={() => openEditor(null)} disabled={subjects.length === 0}><Plus /> Add exam</Button>}
      </div>

      {loadError && <ErrorBanner title="Couldn't load the exam schedule" message={loadError} onRetry={reload} />}

      <DataTable
        columns={columns}
        rows={exams}
        rowKey={e => e.id}
        loading={loading}
        empty={loadError ? <div /> : (
          <EmptyState icon={<CalendarClock size={28} strokeWidth={1.5} />} title="No exams scheduled"
            message={canEdit ? 'Add MSE, RE-MSE and ESE dates so students see them in the app.' : undefined} />
        )}
      />

      {canEdit && (
        <>
          <ExamDialog key={editorKey} open={editorOpen} exam={editing} subjects={subjects} onOpenChange={setEditorOpen} onSaved={reload} />
          <ConfirmDialog
            open={deleting !== null}
            title="Remove this exam?"
            description={deleting ? `${deleting.subject_name} ${examLabel(deleting.exam_type)} on ${fmtDate(deleting.exam_date)} disappears from the students' schedule.` : undefined}
            confirmLabel="Remove"
            busy={deletingBusy}
            onConfirm={remove}
            onCancel={() => setDeleting(null)}
          />
        </>
      )}
    </div>
  );
}
