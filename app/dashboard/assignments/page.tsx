'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, ChevronDown, ChevronUp, FileText, Clock, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';

type Subject = { id: number; name: string; code: string; year: number };
type Assignment = {
  id: number; title: string; description: string | null;
  due_date: string; subject_id: number; posted_by_name: string;
  file_url: string | null; file_name: string | null;
  created_at: string;
};
type Submission = {
  id: number; student_name: string; roll_number: string;
  content: string | null; file_url: string | null; file_name: string | null;
  submitted_at: string; grade: string | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(due: string) {
  return new Date(due) < new Date();
}

export default function AssignmentsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<Record<number, Submission[]>>({});
  const [loadingSubs, setLoadingSubs] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<{ title: string; retry: () => void } | null>(null);
  const [subjectsReload, setSubjectsReload] = useState(0);
  const [assignmentsReload, setAssignmentsReload] = useState(0);

  const [form, setForm] = useState({
    title: '', description: '', subject_id: '', due_date: '',
  });

  useEffect(() => {
    api.get('/admin/subjects').then(r => {
      setSubjects(r.data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      setLoadError({ title: "Couldn't load subjects", retry: () => { setLoadError(null); setLoading(true); setSubjectsReload(k => k + 1); } });
    });
  }, [subjectsReload]);

  useEffect(() => {
    if (!subjectId) { setAssignments([]); return; }
    api.get(`/assignments/subject/${subjectId}`)
      .then(r => setAssignments(r.data))
      .catch(() => setLoadError({ title: "Couldn't load assignments", retry: () => { setLoadError(null); setAssignmentsReload(k => k + 1); } }));
  }, [subjectId, assignmentsReload]);

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const filteredSubjects = yearFilter === 'all' ? subjects : subjects.filter(s => String(s.year) === yearFilter);

  const create = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.subject_id) { setError('Select a subject'); return; }
    if (!form.due_date) { setError('Due date is required'); return; }
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('subject_id', form.subject_id);
      fd.append('due_date', form.due_date);
      if (form.description.trim()) fd.append('description', form.description.trim());
      if (file) fd.append('file', file);
      await api.post('/assignments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ title: '', description: '', subject_id: '', due_date: '' });
      setFile(null);
      setOpen(false);
      if (form.subject_id === subjectId) {
        const r = await api.get(`/assignments/subject/${subjectId}`);
        setAssignments(r.data);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create');
    }
    setSaving(false);
  };

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!submissions[id]) {
      setLoadingSubs(id);
      try {
        const r = await api.get(`/assignments/${id}/submissions`);
        setSubmissions(prev => ({ ...prev, [id]: r.data }));
      } catch {
        setLoadError({ title: "Couldn't load submissions", retry: () => { setLoadError(null); setExpanded(null); } });
      }
      setLoadingSubs(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Set work for a subject and review what students hand in"
        actions={
          <Button onClick={() => { setOpen(true); setError(''); }}>
            <Plus /> New Assignment
          </Button>
        }
      />

      {loadError && <ErrorBanner title={loadError.title} onRetry={loadError.retry} />}

      <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <FormField label="Subject" htmlFor="asg-subject">
              <SelectField
                id="asg-subject"
                value={form.subject_id}
                onValueChange={v => setField('subject_id', v)}
                placeholder="Select subject..."
                options={subjects.map(s => ({ value: String(s.id), label: `${s.name} — Year ${s.year}` }))}
              />
            </FormField>
            <FormField label="Title" htmlFor="asg-title">
              <Input
                id="asg-title"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="e.g. Unit Test 1 Preparation"
              />
            </FormField>
            <FormField label="Description (optional)" htmlFor="asg-description">
              <Textarea
                id="asg-description"
                value={form.description}
                onChange={e => setField('description', e.target.value)}
                rows={3}
                className="min-h-20 resize-none field-sizing-fixed"
                placeholder="Instructions or details..."
              />
            </FormField>
            <FormField label="Due Date & Time" htmlFor="asg-due">
              <Input
                id="asg-due"
                type="datetime-local"
                value={form.due_date}
                onChange={e => setField('due_date', e.target.value)}
                className="dark:[color-scheme:dark]"
              />
            </FormField>
            <FormField label="Attachment (optional)">
              <label className="flex items-center gap-3 w-full border border-dashed border-input rounded-lg px-3 py-3 cursor-pointer hover:bg-accent transition-colors">
                <FileText size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {file ? file.name : 'Click to attach a PDF or file'}
                </span>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              {file && (
                <Button variant="ghost" size="xs" onClick={() => setFile(null)} className="text-destructive hover:text-destructive">
                  <X /> Remove
                </Button>
              )}
            </FormField>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={create} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin" /> : null}
              {saving ? 'Creating...' : 'Create Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Year + Subject filters */}
      <Tabs
        value={yearFilter}
        onValueChange={v => { setYearFilter(String(v)); setSubjectId(''); setAssignments([]); }}
        className="mb-4"
      >
        <TabsList>
          {['all', '1', '2', '3', '4'].map(y => (
            <TabsTrigger key={y} value={y} className="px-3">
              {y === 'all' ? 'All Years' : `Year ${y}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : filteredSubjects.length === 0 ? (
          <Card className="col-span-full">
            <EmptyState className="py-12" title="No subjects found" />
          </Card>
        ) : filteredSubjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSubjectId(String(s.id))}
            aria-pressed={subjectId === String(s.id)}
            className={cn(
              'text-left rounded-xl border p-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              subjectId === String(s.id)
                ? 'bg-primary-soft border-primary text-foreground'
                : 'bg-card border-border hover:bg-accent text-foreground',
            )}
          >
            <p className="font-medium text-sm">{s.name}</p>
            <p className="text-xs mt-0.5 text-muted-foreground">
              {s.code} · Year {s.year}
            </p>
          </button>
        ))}
      </div>

      {!subjectId ? (
        <Card>
          <EmptyState icon={<FileText size={28} strokeWidth={1.5} />} title="Select a subject to view assignments" />
        </Card>
      ) : assignments.length === 0 ? (
        <Card>
          <EmptyState icon={<FileText size={28} strokeWidth={1.5} />} title="No assignments for this subject" />
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const overdue = isOverdue(a.due_date);
            const subs = submissions[a.id] || [];
            const isExpanded = expanded === a.id;
            return (
              <Card key={a.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <p className="text-foreground font-medium text-sm">{a.title}</p>
                        {overdue && (
                          <StatusPill tone="danger">Overdue</StatusPill>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed ml-5 mb-2">{a.description}</p>
                      )}
                      <div className="flex items-center gap-4 ml-5 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock size={11} />
                          <span>Due: {fmt(a.due_date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users size={11} />
                          <span>{subs.length} submissions</span>
                        </div>
                        {a.file_url && (
                          <a href={a.file_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <FileText size={11} />
                            <span>{a.file_name || 'Attachment'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleExpand(a.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Hide submissions' : 'Show submissions'}
                      className="shrink-0 text-muted-foreground"
                    >
                      {loadingSubs === a.id
                        ? <Loader2 className="animate-spin" />
                        : isExpanded ? <ChevronUp /> : <ChevronDown />
                      }
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      {subs.length === 0 ? (
                        <EmptyState className="py-6" title="No submissions yet" />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              {['Student', 'Roll No', 'Note', 'File', 'Submitted At'].map(h => (
                                <TableHead key={h} className="label">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subs.map(sub => (
                              <TableRow key={sub.id}>
                                <TableCell className="text-foreground text-sm">{sub.student_name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{sub.roll_number}</TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                  {sub.content || '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {sub.file_url
                                    ? <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">{sub.file_name || 'View'}</a>
                                    : <span className="text-muted-foreground">—</span>
                                  }
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">{fmt(sub.submitted_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
