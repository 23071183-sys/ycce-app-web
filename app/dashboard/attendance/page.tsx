'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, XCircle, Save, ChevronLeft, ChevronRight, ArrowLeft, Search, X, TrendingUp, TrendingDown } from 'lucide-react';

type Subject = { id: number; name: string; code: string; year: number };
type StudentRow = { id: number; name: string; roll_number: string; status: string | null };
type DayData = { date: string; present: number; absent: number; total: number };
type SummaryRow = { student_id: number; student_name: string; roll_number: string; present: number; total: number; percentage: number };
type StudentDetail = { summary: { name: string; roll_number: string; present_count: number; total_count: number; percentage: string }; records: { date: string; status: string }[] };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toYM(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const [classYear, setClassYear] = useState('3');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');

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
      .catch(() => {});
  }, [classYear]);

  // Load monthly data when subject/month changes
  const loadMonth = useCallback(async (sid: string, y: number, m: number) => {
    if (!sid) return;
    setLoadingMonth(true);
    try {
      const r = await api.get(`/admin/attendance/monthly?subject_id=${sid}&year=${classYear}&month=${toYM(y, m)}`);
      setMonthData(r.data);
    } catch {}
    setLoadingMonth(false);
  }, [classYear]);

  useEffect(() => {
    if (subjectId) loadMonth(subjectId, calYear, calMonth);
  }, [subjectId, calYear, calMonth, loadMonth]);

  // Load students for selected date
  useEffect(() => {
    if (!subjectId || !selectedDate) return;
    setLoadingStudents(true); setSaved(false);
    api.get(`/admin/attendance?subject_id=${subjectId}&date=${selectedDate}&year=${classYear}`)
      .then(r => setStudents(r.data.map((s: StudentRow) => ({ ...s, status: s.status || 'present' }))))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, [subjectId, selectedDate, classYear]);

  // Load summary
  useEffect(() => {
    if (!subjectId || !showSummary) return;
    setLoadingSummary(true);
    api.get(`/admin/attendance/summary?subject_id=${subjectId}`)
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, [subjectId, showSummary, saved]);

  const openStudentDetail = async (row: SummaryRow) => {
    setDetailStudent(row);
    setStudentDetail(null);
    setLoadingDetail(true);
    try {
      const r = await api.get(`/attendance/subject/${subjectId}/student/${row.student_id}`);
      setStudentDetail(r.data);
    } catch {}
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
    } catch {}
    setSaving(false);
  };

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const dayMap: Record<string, DayData> = {};
  monthData.forEach(d => { dayMap[d.date.split('T')[0]] = d; });

  const getDayStyle = (dateStr: string) => {
    const d = dayMap[dateStr];
    const isSelected = selectedDate === dateStr;
    const isToday = dateStr === now.toISOString().split('T')[0];
    if (isSelected) return 'bg-foreground text-background font-semibold';
    if (!d) return isToday ? 'border border-border text-foreground' : 'text-muted-foreground hover:bg-muted';
    const pct = d.present / d.total;
    if (pct >= 0.75) return 'bg-green-900/60 text-green-300 hover:bg-green-900';
    if (pct >= 0.5) return 'bg-yellow-900/60 text-yellow-300 hover:bg-yellow-900';
    return 'bg-red-900/60 text-red-300 hover:bg-red-900';
  };

  const presentCount = students.filter(s => s.status === 'present').length;
  const pctColor = (p: number) => p >= 75 ? 'text-green-400' : p >= 60 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div>
      <h1 className="text-2xl font-light tracking-widest uppercase text-foreground mb-8">Attendance</h1>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs tracking-widest uppercase">Year</Label>
          <div className="flex gap-2">
            {['1','2','3','4'].map(y => (
              <button key={y} onClick={() => setClassYear(y)}
                className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                  classYear === y ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'
                }`}>Y{y}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs tracking-widest uppercase">Subject</Label>
          <select value={subjectId} onChange={e => handleSubjectChange(e.target.value)}
            className="w-full bg-muted border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600">
            <option value="">Select subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
          {subjectId && (
            <button onClick={() => setShowSummary(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              {showSummary ? 'Hide summary' : 'View overall summary'}
            </button>
          )}
        </div>
      </div>

      {!subjectId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-20 text-center text-muted-foreground tracking-wider uppercase text-sm">
            Select a year and subject to view attendance
          </CardContent>
        </Card>
      ) : showSummary ? (
        /* Summary view */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSummary(false)}
              className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-foreground text-sm tracking-widest uppercase">Overall Summary — {subjectName}</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Summary table */}
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {loadingSummary ? (
                  <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        {['Student','Roll No','Present','Total','%',''].map(h => (
                          <TableHead key={h} className="text-muted-foreground text-xs tracking-widest uppercase">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.map((r, i) => (
                        <TableRow
                          key={i}
                          onClick={() => openStudentDetail(r)}
                          className={`border-border cursor-pointer transition-colors ${detailStudent?.student_id === r.student_id ? 'bg-muted' : 'hover:bg-muted/60'}`}
                        >
                          <TableCell className="text-foreground text-sm font-medium">{r.student_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.roll_number}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.present}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{r.total}</TableCell>
                          <TableCell className={`text-sm font-semibold ${pctColor(r.percentage)}`}>
                            {r.total > 0 ? `${r.percentage}%` : '—'}
                          </TableCell>
                          <TableCell>
                            {r.total > 0 && (
                              r.percentage >= 75
                                ? <TrendingUp size={14} className="text-green-500" />
                                : <TrendingDown size={14} className="text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {summary.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-12 uppercase tracking-widest text-sm">
                            No attendance recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Per-student detail panel */}
            {detailStudent ? (
              <Card className="bg-card border-border">
                <CardContent className="pt-5 pb-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-foreground font-medium">{detailStudent.student_name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{detailStudent.roll_number} · {subjectName}</p>
                    </div>
                    <button onClick={() => { setDetailStudent(null); setStudentDetail(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  {loadingDetail ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
                  ) : studentDetail ? (
                    <>
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                          { label: 'Present', value: studentDetail.summary.present_count, color: 'text-green-400' },
                          { label: 'Absent', value: Number(studentDetail.summary.total_count) - Number(studentDetail.summary.present_count), color: 'text-red-400' },
                          { label: 'Total', value: studentDetail.summary.total_count, color: 'text-foreground' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-muted rounded-lg p-3 text-center border border-border">
                            <p className={`text-xl font-light ${color}`}>{value}</p>
                            <p className="text-muted-foreground text-xs mt-1 tracking-wider uppercase">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Percentage bar */}
                      {studentDetail.summary.total_count > 0 && (() => {
                        const pct = parseFloat(studentDetail.summary.percentage || '0');
                        const pc = pct >= 75 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                        const tc = pct >= 75 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';
                        return (
                          <div className="mb-5">
                            <div className="flex justify-between items-center mb-1.5">
                              <p className="text-xs text-muted-foreground tracking-widest uppercase">Attendance</p>
                              <p className={`text-sm font-semibold ${tc}`}>{pct}%</p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${pc}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            {pct < 75 && (
                              <p className="text-red-400 text-xs mt-2">
                                ⚠️ Needs {Math.ceil((0.75 * Number(studentDetail.summary.total_count) - Number(studentDetail.summary.present_count)) / 0.25)} more classes to reach 75%
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Date-wise records */}
                      <p className="text-muted-foreground text-xs tracking-widest uppercase mb-3">Date-wise Record</p>
                      <div className="space-y-0 max-h-64 overflow-y-auto rounded-lg border border-border">
                        {studentDetail.records.length === 0 ? (
                          <p className="text-center text-muted-foreground text-sm py-8 tracking-widest uppercase">No records</p>
                        ) : studentDetail.records.map((rec, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i !== studentDetail.records.length - 1 ? 'border-b border-border' : ''}`}>
                            <p className="text-foreground text-sm">
                              {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border tracking-wider uppercase ${
                              rec.status === 'present'
                                ? 'bg-green-900/30 text-green-400 border-green-800'
                                : 'bg-red-900/30 text-red-400 border-red-800'
                            }`}>
                              {rec.status === 'present' ? 'P' : 'A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <Search size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-foreground text-sm font-medium">Click a student to view report</p>
                  <p className="text-muted-foreground text-xs tracking-wide text-center">Date-wise attendance and full stats will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p className="text-foreground text-sm font-medium tracking-widest uppercase">
                    {MONTHS[calMonth]} {calYear}
                  </p>
                  {loadingMonth && <Loader2 size={12} className="animate-spin text-muted-foreground mx-auto mt-1" />}
                </div>
                <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-muted-foreground text-xs tracking-wider uppercase py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const d = dayMap[dateStr];
                  return (
                    <button
                      key={day}
                      onClick={() => { setSelectedDate(dateStr); setShowSummary(false); }}
                      className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors cursor-pointer ${getDayStyle(dateStr)}`}
                    >
                      <span>{day}</span>
                      {d && (
                        <span className="text-[9px] opacity-70 leading-none mt-0.5">
                          {d.present}/{d.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-5 justify-center flex-wrap">
                {[
                  { color: 'bg-green-900/60', label: '≥75% present' },
                  { color: 'bg-yellow-900/60', label: '50–74%' },
                  { color: 'bg-red-900/60', label: '<50% present' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${color}`} />
                    <span className="text-muted-foreground text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance marking panel */}
          <div>
            {!selectedDate ? (
              <Card className="bg-card border-border h-full">
                <CardContent className="py-20 text-center text-muted-foreground tracking-wider uppercase text-sm">
                  Select a date on the calendar
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">{subjectName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!loadingStudents && students.length > 0 && (
                      <>
                        <button onClick={() => markAll('present')}
                          className="text-xs text-green-400 border border-green-900 px-2.5 py-1 rounded hover:bg-green-900/30 transition-colors">
                          All P
                        </button>
                        <button onClick={() => markAll('absent')}
                          className="text-xs text-red-400 border border-red-900 px-2.5 py-1 rounded hover:bg-red-900/30 transition-colors">
                          All A
                        </button>
                        <Button onClick={saveAttendance} disabled={saving} size="sm"
                          className={`text-xs tracking-widest uppercase font-light px-3 ${
                            saved ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-foreground text-background hover:bg-foreground/90'
                          }`}>
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          <span className="ml-1">{saving ? '...' : saved ? '✓' : 'Save'}</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    {students.length > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-muted-foreground text-xs shrink-0">
                          <span className="text-foreground font-medium">{presentCount}</span>/{students.length} present
                        </p>
                        <div className="relative flex-1 max-w-xs">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search student..."
                            className="w-full bg-muted border border-border text-foreground text-sm rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    )}
                    <Card className="bg-card border-border">
                      <CardContent className="p-0">
                        {(() => {
                          const filtered = students.filter(s =>
                            s.name.toLowerCase().includes(search.toLowerCase()) ||
                            s.roll_number.toLowerCase().includes(search.toLowerCase())
                          );
                          if (students.length === 0) return (
                            <div className="py-12 text-center text-muted-foreground text-sm uppercase tracking-widest">
                              No students for Year {classYear}
                            </div>
                          );
                          if (filtered.length === 0) return (
                            <div className="py-12 text-center text-muted-foreground text-sm uppercase tracking-widest">
                              No match for "{search}"
                            </div>
                          );
                          return filtered.map((s, i) => (
                            <div key={s.id} onClick={() => toggle(s.id)}
                              className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors
                                ${i !== filtered.length - 1 ? 'border-b border-border' : ''}
                                ${s.status === 'present' ? 'hover:bg-muted' : 'bg-red-950/20 hover:bg-red-950/30'}
                              `}>
                              <div className="flex items-center gap-2.5">
                                <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}</span>
                                <div>
                                  <p className="text-foreground text-sm">{s.name}</p>
                                  <p className="text-muted-foreground text-xs">{s.roll_number}</p>
                                </div>
                              </div>
                              {s.status === 'present'
                                ? <CheckCircle size={16} className="text-green-400" />
                                : <XCircle size={16} className="text-red-400" />
                              }
                            </div>
                          ));
                        })()}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
