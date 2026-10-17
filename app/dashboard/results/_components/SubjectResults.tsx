'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { gradeTone } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatusPill } from '@/components/shared/StatusPill';
import { HueDot } from '@/components/shared/HueDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { BookOpen } from 'lucide-react';

type Subject = { id: number; name: string; code?: string | null; year: number };
type Row = {
  id: number; student_id: number; student_name: string; roll_number: string | null; semester: number;
  internal_marks: string | number | null; external_marks: string | number | null; total_marks: string | number | null;
  grade: string | null; result: string | null;
};

const num = (v: string | number | null) => (v === null || v === undefined || v === '' ? '—' : String(Number(v)));
const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

// Read-only view of one subject's results: marks, grade and pass/fail per
// student. Each subject carries its hue; grades are coloured by band.
export function SubjectResults({ isAdmin }: { isAdmin: boolean }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(isAdmin ? '/admin/subjects' : '/subjects/my-subjects')
      .then(r => setSubjects(r.data))
      .catch(e => setError(errorText(e, 'Failed to load subjects')));
  }, [isAdmin]);

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    api.get(`/results/subject/${subjectId}`, { params: { semester: semester || undefined } })
      .then(r => { if (!cancelled) { setRows(r.data); setError(''); } })
      .catch(e => { if (!cancelled) setError(errorText(e, 'Failed to load results')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subjectId, semester]);

  const pick = (fn: () => void) => { setLoading(true); fn(); };

  const columns: Column<Row>[] = [
    {
      key: 'student',
      header: 'Student',
      cell: r => (
        <div>
          <p className="text-foreground">{r.student_name}</p>
          <p className="text-xs text-muted-foreground">{r.roll_number}{semester ? '' : ` · Sem ${r.semester}`}</p>
        </div>
      ),
    },
    { key: 'internal', header: 'Internal', align: 'right', cell: r => <span className="tabular-nums text-muted-foreground">{num(r.internal_marks)}</span> },
    { key: 'external', header: 'External', align: 'right', cell: r => <span className="tabular-nums text-muted-foreground">{num(r.external_marks)}</span> },
    { key: 'total', header: 'Total', align: 'right', cell: r => <span className="tabular-nums font-medium text-foreground">{num(r.total_marks)}</span> },
    {
      key: 'grade',
      header: 'Grade',
      align: 'center',
      cell: r => (r.grade ? <StatusPill tone={gradeTone(r.grade)} className="min-w-9 justify-center">{r.grade}</StatusPill> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'result',
      header: 'Result',
      cell: r => (r.result ? <StatusPill tone={/fail/i.test(r.result) ? 'danger' : 'success'}>{r.result}</StatusPill> : <span className="text-muted-foreground">—</span>),
    },
  ];

  return (
    <div>
      <p className="label mb-3">Subject Results</p>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,22rem)_12rem]">
        <FormField label="Subject" htmlFor="sr-subject">
          <SelectField
            id="sr-subject"
            value={subjectId}
            onValueChange={v => pick(() => setSubjectId(v))}
            placeholder="Select subject…"
            options={subjects.map(s => ({
              value: String(s.id),
              label: (
                <span className="flex items-center gap-2">
                  <HueDot subject={s.code || s.id} />
                  {s.code ? `${s.code} — ` : ''}{s.name} (Year {s.year})
                </span>
              ),
            }))}
          />
        </FormField>
        <FormField label="Semester" htmlFor="sr-sem">
          <SelectField
            id="sr-sem"
            value={semester}
            onValueChange={v => (subjectId ? pick(() => setSemester(v)) : setSemester(v))}
            options={[{ value: '', label: 'All semesters' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: `Semester ${n}` }))]}
          />
        </FormField>
      </div>

      {error && <ErrorBanner title="Couldn't load subject results" message={error} />}

      {!subjectId ? (
        <Card><EmptyState icon={<BookOpen size={28} strokeWidth={1.5} />} title="Pick a subject" message="Marks, grades and results for every student in it appear here." /></Card>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={r => r.id}
          loading={loading}
          empty={<EmptyState title="No results entered" message="Marks entered on the Marks Entry page show here once graded." />}
        />
      )}
    </div>
  );
}
