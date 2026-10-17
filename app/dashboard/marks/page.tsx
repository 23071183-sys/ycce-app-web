'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Check, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { EmptyState } from '@/components/shared/EmptyState';
import { HueDot } from '@/components/shared/HueDot';

type Subject = { id: number; name: string; code: string; year: number; professor_name?: string };
type Component = { key: string; label: string; max: number };
type ReMse = { key: string; label: string; max: number; replaces: string[] };
type ReMseSlot = '' | 'mse1' | 'mse2';
type StudentRow = {
  student_id: number;
  student_name: string;
  roll_number: string;
  mse1_marks: string | null;
  mse2_marks: string | null;
  ta_marks: string | null;
  ese_marks: string | null;
  re_mse_marks: string;
  re_mse_for: ReMseSlot;
};

// RE-MSE stands in for whichever MSE the student missed.
const SLOT_KEY: Record<'mse1' | 'mse2', string> = { mse1: 'mse1_marks', mse2: 'mse2_marks' };
const SLOT_LABEL: Record<'mse1' | 'mse2', string> = { mse1: 'MSE 1', mse2: 'MSE 2' };

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

export default function MarksPage() {
  const { isAdmin, isProfessor, ready } = useCurrentUser();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());

  const [components, setComponents] = useState<Component[]>([]);
  const [reMse, setReMse] = useState<ReMse | null>(null);
  const [maxTotal, setMaxTotal] = useState(100);
  const [rows, setRows] = useState<StudentRow[]>([]);

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Admins mark any subject; a professor is only offered their own, matching
  // what the API will actually allow them to write.
  useEffect(() => {
    if (!ready) return;
    const endpoint = isAdmin ? '/admin/subjects' : '/subjects/my-subjects';
    api.get(endpoint)
      .then(r => setSubjects(r.data))
      .catch(e => setError(e.response?.data?.error || 'Could not load subjects'));
  }, [ready, isAdmin]);

  const loadSheet = useCallback(async () => {
    if (!subjectId || !semester) return;
    setLoadingSheet(true);
    setError('');
    setSaved(false);
    try {
      const r = await api.get(`/results/subject/${subjectId}/sheet`, { params: { semester } });
      setComponents(r.data.components);
      setReMse(r.data.re_mse ?? null);
      setMaxTotal(r.data.max_total);
      setRows(r.data.students.map((s: any) => ({
        ...s,
        mse1_marks: s.mse1_marks ?? '',
        mse2_marks: s.mse2_marks ?? '',
        ta_marks: s.ta_marks ?? '',
        ese_marks: s.ese_marks ?? '',
        re_mse_marks: s.re_mse_marks ?? '',
        re_mse_for: s.re_mse_for ?? '',
      })));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not load the marks sheet');
      setRows([]);
    }
    setLoadingSheet(false);
  }, [subjectId, semester]);

  useEffect(() => { loadSheet(); }, [loadSheet]);

  const setMark = (studentId: number, key: string, value: string) => {
    setSaved(false);
    setRows(rs => rs.map(r => {
      if (r.student_id !== studentId) return r;
      const next = { ...r, [key]: value };
      // Typing a RE-MSE mark with no slot chosen picks the MSE that's blank,
      // since RE-MSE only exists for an exam the student missed.
      if (key === 're_mse_marks' && value !== '' && !next.re_mse_for) {
        if (next.mse1_marks === '') next.re_mse_for = 'mse1';
        else if (next.mse2_marks === '') next.re_mse_for = 'mse2';
      }
      return next;
    }));
  };

  const hasReMse = (r: StudentRow) => r.re_mse_marks !== '';
  // The slot RE-MSE is filling, if any.
  const replacedKey = (r: StudentRow) =>
    hasReMse(r) && r.re_mse_for ? SLOT_KEY[r.re_mse_for] : null;

  const rowTotal = (r: StudentRow) =>
    components.reduce((sum, c) => {
      const v = c.key === replacedKey(r) ? r.re_mse_marks : (r as any)[c.key];
      return sum + (Number(v) || 0);
    }, 0);

  // Why a row's RE-MSE can't be saved yet, or null when it's fine.
  const reMseProblem = (r: StudentRow): string | null => {
    if (!hasReMse(r)) return null;
    if (reMse && Number(r.re_mse_marks) > reMse.max) return `Max ${reMse.max}`;
    if (!r.re_mse_for) return 'Pick the missed MSE';
    if ((r as any)[SLOT_KEY[r.re_mse_for]] !== '') return `Clear ${SLOT_LABEL[r.re_mse_for]} first`;
    return null;
  };

  // Flag a value that exceeds its component's ceiling as the user types, rather
  // than letting the whole save fail on one bad cell.
  const isOver = (r: StudentRow, c: Component) => {
    const v = (r as any)[c.key];
    return v !== '' && Number(v) > c.max;
  };
  const hasErrors = rows.some(r => components.some(c => isOver(r, c)) || reMseProblem(r) !== null);
  const enteredCount = rows.filter(r => hasReMse(r) || components.some(c => (r as any)[c.key] !== '')).length;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/results/bulk', {
        subject_id: Number(subjectId),
        semester: Number(semester),
        academic_year: academicYear.trim() || null,
        records: rows.map(r => ({
          student_id: r.student_id,
          roll_number: r.roll_number,
          mse1_marks: r.mse1_marks === '' ? null : r.mse1_marks,
          mse2_marks: r.mse2_marks === '' ? null : r.mse2_marks,
          ta_marks: r.ta_marks === '' ? null : r.ta_marks,
          ese_marks: r.ese_marks === '' ? null : r.ese_marks,
          re_mse_marks: r.re_mse_marks === '' ? null : r.re_mse_marks,
          re_mse_for: hasReMse(r) && r.re_mse_for ? r.re_mse_for : null,
        })),
      });
      setSaved(true);
      setError('');
      if (res.data?.saved === 0) setError('Nothing to save — no marks were entered.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save marks');
    }
    setSaving(false);
  };

  if (!ready) return <Skeleton className="h-64 w-full" />;

  if (!isAdmin && !isProfessor) {
    return (
      <EmptyState title="Marks entry is for staff" message="Only teaching staff and administrators can enter marks." />
    );
  }

  return (
    <div>
      <PageHeader
        title="Marks Entry"
        description={components.length
          ? components.map(c => `${c.label} ${c.max}`).join(' + ') + ` = ${maxTotal}` +
            (reMse ? ` · ${reMse.label} replaces a missed MSE` : '')
          : 'Select a subject and semester to begin.'}
      />

      <Card className="mb-6">
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Subject" htmlFor="marks-subject">
            <SelectField
              id="marks-subject"
              value={subjectId}
              onValueChange={setSubjectId}
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

          <FormField label="Semester" htmlFor="marks-semester">
            <SelectField
              id="marks-semester"
              value={semester}
              onValueChange={setSemester}
              placeholder="Select semester…"
              options={SEMESTERS.map(n => ({ value: String(n), label: `Semester ${n}` }))}
            />
          </FormField>

          <FormField label="Academic Year" htmlFor="marks-ay">
            <Input
              id="marks-ay"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2026-27"
            />
          </FormField>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-destructive">
          <CircleAlert size={14} className="shrink-0" />
          {error}
        </p>
      )}

      {loadingSheet && <Skeleton className="h-64 w-full" />}

      {!loadingSheet && rows.length > 0 && (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="label">Roll No</TableHead>
                    <TableHead className="label">Student</TableHead>
                    {components.map(c => (
                      <TableHead key={c.key} className="label text-center">
                        {c.label}<span className="normal-case tracking-normal opacity-60"> /{c.max}</span>
                      </TableHead>
                    ))}
                    {reMse && (
                      <TableHead className="label text-center">
                        {reMse.label}<span className="normal-case tracking-normal opacity-60"> /{reMse.max}</span>
                      </TableHead>
                    )}
                    <TableHead className="label text-center">
                      Total<span className="normal-case tracking-normal opacity-60"> /{maxTotal}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => {
                    const total = rowTotal(r);
                    return (
                      <TableRow key={r.student_id}>
                        <TableCell className="text-muted-foreground text-sm">{r.roll_number}</TableCell>
                        <TableCell className="text-foreground text-sm">{r.student_name}</TableCell>
                        {components.map(c => {
                          // The MSE that RE-MSE is standing in for: shown greyed so
                          // it's clear which slot the substitute fills.
                          const replaced = c.key === replacedKey(r);
                          const value = (r as any)[c.key];
                          const invalid = isOver(r, c) || (replaced && value !== '');
                          return (
                            <TableCell key={c.key} className="text-center">
                              <Input
                                type="number"
                                min={0}
                                max={c.max}
                                inputMode="numeric"
                                value={value}
                                placeholder={replaced ? 'RE' : undefined}
                                title={replaced ? `Filled by ${reMse?.label}` : undefined}
                                onChange={e => setMark(r.student_id, c.key, e.target.value)}
                                aria-invalid={invalid || undefined}
                                className={cn(
                                  'w-16 mx-auto text-center tabular-nums',
                                  invalid && 'border-destructive',
                                  replaced && 'opacity-50 bg-muted',
                                )}
                              />
                            </TableCell>
                          );
                        })}
                        {reMse && (
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={reMse.max}
                                inputMode="numeric"
                                value={r.re_mse_marks}
                                onChange={e => setMark(r.student_id, 're_mse_marks', e.target.value)}
                                aria-invalid={reMseProblem(r) ? true : undefined}
                                className={cn('w-16 text-center tabular-nums', reMseProblem(r) && 'border-destructive')}
                              />
                              {hasReMse(r) && (
                                <SelectField
                                  aria-label="MSE this RE-MSE replaces"
                                  size="sm"
                                  value={r.re_mse_for}
                                  onValueChange={v => setMark(r.student_id, 're_mse_for', v)}
                                  className="w-auto text-xs"
                                  options={[
                                    { value: '', label: 'for…' },
                                    { value: 'mse1', label: 'for MSE 1' },
                                    { value: 'mse2', label: 'for MSE 2' },
                                  ]}
                                />
                              )}
                              {reMseProblem(r) && (
                                <span className="text-destructive text-[11px]">{reMseProblem(r)}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell
                          className={`text-center text-sm font-semibold tabular-nums ${
                            total === 0 ? 'text-muted-foreground'
                              : total >= 40 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {total || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-border">
              <p className="text-muted-foreground text-xs">
                {enteredCount} of {rows.length} students have marks entered
                {hasErrors && <span className="text-destructive"> · some rows need fixing — see the red boxes</span>}
              </p>
              <Button onClick={save} disabled={saving || hasErrors}>
                {saving ? <Loader2 className="animate-spin" />
                  : saved ? <Check />
                  : <Save />}
                {saving ? 'Saving' : saved ? 'Saved' : 'Save Marks'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!loadingSheet && subjectId && semester && rows.length === 0 && !error && (
        <Card>
          <EmptyState title="No students" message="No approved students found for this subject's year." />
        </Card>
      )}
    </div>
  );
}
