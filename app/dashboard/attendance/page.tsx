'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';
import { MonthlyView } from './_components/MonthlyView';
import { MarkAttendance } from './_components/MarkAttendance';
import { SubjectReport } from './_components/SubjectReport';
import type { DayData, StudentDetail, StudentRow, Subject, SummaryRow } from './_components/types';

function toYM(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

type PageError = { title: string; retry?: () => void };

export default function AttendancePage() {
  const [classYear, setClassYear] = useState('3');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectsReload, setSubjectsReload] = useState(0);
  const [monthReload, setMonthReload] = useState(0);
  const [error, setError] = useState<PageError | null>(null);

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed
  const [monthData, setMonthData] = useState<DayData[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Selected date → mark attendance
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Summary
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [search, setSearch] = useState('');

  // Per-student detail panel
  const [detailStudent, setDetailStudent] = useState<SummaryRow | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load subjects when year changes
  useEffect(() => {
    setSubjectId(''); setSubjectName(''); setSelectedDate(null); setMonthData([]);
    api.get('/admin/subjects')
      .then(r => setSubjects(r.data.filter((s: Subject) => s.year === parseInt(classYear))))
      .catch(() => setError({ title: "Couldn't load subjects", retry: () => { setError(null); setSubjectsReload(k => k + 1); } }));
  }, [classYear, subjectsReload]);

  // Load monthly data when subject/month changes
  const loadMonth = useCallback(async (sid: string, y: number, m: number) => {
    if (!sid) return;
    setLoadingMonth(true);
    try {
      const r = await api.get(`/admin/attendance/monthly?subject_id=${sid}&year=${classYear}&month=${toYM(y, m)}`);
      setMonthData(r.data);
    } catch {
      setError({ title: "Couldn't load this month's attendance", retry: () => { setError(null); setMonthReload(k => k + 1); } });
    }
    setLoadingMonth(false);
  }, [classYear]);

  useEffect(() => {
    if (subjectId) loadMonth(subjectId, calYear, calMonth);
  }, [subjectId, calYear, calMonth, loadMonth, monthReload]);

  // Load students for selected date
  useEffect(() => {
    if (!subjectId || !selectedDate) return;
    setLoadingStudents(true); setSaved(false);
    api.get(`/admin/attendance?subject_id=${subjectId}&date=${selectedDate}&year=${classYear}`)
      .then(r => { setStudents(r.data.map((s: StudentRow) => ({ ...s, status: s.status || 'present' }))); setError(null); })
      .catch(() => setError({ title: "Couldn't load students for this date" }))
      .finally(() => setLoadingStudents(false));
  }, [subjectId, selectedDate, classYear]);

  // Load summary
  useEffect(() => {
    if (!subjectId || !showSummary) return;
    setLoadingSummary(true);
    api.get(`/admin/attendance/summary?subject_id=${subjectId}`)
      .then(r => { setSummary(r.data); setError(null); })
      .catch(() => setError({ title: "Couldn't load the attendance summary" }))
      .finally(() => setLoadingSummary(false));
  }, [subjectId, showSummary, saved]);

  const openStudentDetail = async (row: SummaryRow) => {
    setDetailStudent(row);
    setStudentDetail(null);
    setLoadingDetail(true);
    try {
      const r = await api.get(`/attendance/subject/${subjectId}/student/${row.student_id}`);
      setStudentDetail(r.data);
    } catch {
      setError({ title: `Couldn't load ${row.student_name}'s attendance`, retry: () => { setError(null); openStudentDetail(row); } });
    }
    setLoadingDetail(false);
  };

  const handleSubjectChange = (id: string) => {
    const s = subjects.find(s => String(s.id) === id);
    setSubjectId(id);
    setSubjectName(s?.name || '');
    setSelectedDate(null);
    setStudents([]);
    setShowSummary(false);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const toggle = (id: number) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
    ));
  };
  const markAll = (status: 'present' | 'absent') =>
    setStudents(prev => prev.map(s => ({ ...s, status })));

  const saveAttendance = async () => {
    if (!subjectId || !selectedDate || students.length === 0) return;
    setSaving(true);
    try {
      await api.post('/attendance/mark-bulk', {
        subject_id: parseInt(subjectId),
        date: selectedDate,
        records: students.map(s => ({ student_id: s.id, status: s.status })),
      });
      setSaved(true);
      await loadMonth(subjectId, calYear, calMonth);
    } catch {
      setError({ title: "Couldn't save attendance", retry: () => { setError(null); saveAttendance(); } });
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader title="Attendance" description="Mark a day's attendance or review a subject's record" />

      {error && <ErrorBanner title={error.title} onRetry={error.retry} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <FormField label="Year">
          <Tabs value={classYear} onValueChange={v => setClassYear(String(v))}>
            <TabsList className="w-full">
              {['1', '2', '3', '4'].map(y => (
                <TabsTrigger key={y} value={y}>Y{y}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </FormField>
        <FormField label="Subject" htmlFor="attendance-subject">
          <SelectField
            id="attendance-subject"
            value={subjectId}
            onValueChange={handleSubjectChange}
            placeholder="Select subject..."
            options={subjects.map(s => ({ value: String(s.id), label: `${s.name} (${s.code})` }))}
          />
          {subjectId && (
            <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setShowSummary(v => !v)}>
              {showSummary ? 'Hide summary' : 'View overall summary'}
            </Button>
          )}
        </FormField>
      </div>

      {!subjectId ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={28} strokeWidth={1.5} />}
            title="Select a year and subject to view attendance"
          />
        </Card>
      ) : showSummary ? (
        <SubjectReport
          subjectName={subjectName}
          summary={summary}
          loading={loadingSummary}
          detailStudent={detailStudent}
          studentDetail={studentDetail}
          loadingDetail={loadingDetail}
          onBack={() => setShowSummary(false)}
          onOpenStudent={openStudentDetail}
          onCloseStudent={() => { setDetailStudent(null); setStudentDetail(null); }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyView
            calYear={calYear}
            calMonth={calMonth}
            monthData={monthData}
            loading={loadingMonth}
            selectedDate={selectedDate}
            onSelectDate={date => { setSelectedDate(date); setShowSummary(false); }}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
          <MarkAttendance
            selectedDate={selectedDate}
            subjectName={subjectName}
            classYear={classYear}
            students={students}
            loading={loadingStudents}
            saving={saving}
            saved={saved}
            search={search}
            onSearchChange={setSearch}
            onToggle={toggle}
            onMarkAll={markAll}
            onSave={saveAttendance}
          />
        </div>
      )}
    </div>
  );
}
