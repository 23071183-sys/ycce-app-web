'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Lecture = {
  id: number; subject_name: string; professor_name: string;
  day: string; start_time: string; end_time: string; room?: string;
};

export default function TimetablePage() {
  const [items, setItems] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState('1');
  const [form, setForm] = useState({
    custom_subject_name: '', faculty_name: '',
    day: 'Monday', start_time: '09:00', end_time: '10:00', room: '',
  });

  const loadTimetable = async (y: string) => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/timetable/year/${y}`);
      setItems(r.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load timetable');
    }
    setLoading(false);
  };

  useEffect(() => { loadTimetable(year); }, [year]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async () => {
    if (!form.custom_subject_name.trim()) { setError('Subject name is required'); return; }
    if (!form.start_time) { setError('Start time is required'); return; }
    if (!form.end_time) { setError('End time is required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/timetable', {
        custom_subject_name: form.custom_subject_name.trim(),
        year: parseInt(year),
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room.trim() || null,
      });
      setForm({ custom_subject_name: '', faculty_name: '', day: 'Monday', start_time: '09:00', end_time: '10:00', room: '' });
      setOpen(false);
      await loadTimetable(year);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add');
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/timetable/${id}`);
      setItems(prev => prev.filter(l => l.id !== id));
    } catch {
      setError('Failed to delete lecture. Please try again.');
    }
  };

  const byDay = DAYS.map(d => ({ day: d, lectures: items.filter(l => l.day === d) }));

  return (
    <div>
      <PageHeader
        title="Timetable"
        description="The weekly lecture schedule for each year"
        actions={
          <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
            <DialogTrigger render={<Button />}>
              <Plus /> Add Lecture
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Lecture — Year {year}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <FormField label="Subject Name" htmlFor="tt-subject">
                  <Input
                    id="tt-subject"
                    value={form.custom_subject_name}
                    onChange={e => set('custom_subject_name', e.target.value)}
                    placeholder="e.g. Data Structures, DBMS, Mathematics..."
                  />
                </FormField>
                <FormField label="Day" htmlFor="tt-day">
                  <SelectField
                    id="tt-day"
                    value={form.day}
                    onValueChange={v => set('day', v)}
                    options={DAYS.map(d => ({ value: d, label: d }))}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'Start Time', key: 'start_time' }, { label: 'End Time', key: 'end_time' }].map(({ label, key }) => (
                    <FormField key={key} label={label} htmlFor={`tt-${key}`} hint={(form as any)[key] || 'Not set'}>
                      <Input
                        id={`tt-${key}`}
                        type="time"
                        value={(form as any)[key]}
                        onChange={e => set(key, e.target.value)}
                        onBlur={e => { if (!e.target.value) set(key, key === 'start_time' ? '09:00' : '10:00'); }}
                        className="dark:[color-scheme:dark]"
                      />
                    </FormField>
                  ))}
                </div>
                <FormField label="Room (optional)" htmlFor="tt-room">
                  <Input id="tt-room" value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. CT-301" />
                </FormField>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={create} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Add Lecture'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {error && !open && (
        <ErrorBanner title="Something went wrong" message={error} onRetry={() => loadTimetable(year)} />
      )}

      <Tabs value={year} onValueChange={v => setYear(String(v))} className="mb-6">
        <TabsList>
          {['1', '2', '3', '4'].map(y => (
            <TabsTrigger key={y} value={y} className="px-3">Year {y}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {byDay.map(({ day, lectures }) => lectures.length > 0 && (
            <Card key={day}>
              <CardContent>
                <p className="label mb-3">{day}</p>
                <div className="space-y-2">
                  {lectures.map(l => (
                    <div key={l.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs w-28 shrink-0 tabular-nums">
                          <Clock size={11} />
                          <span>{l.start_time} – {l.end_time}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-foreground text-sm">{l.subject_name}</span>
                          {l.professor_name && (
                            <span className="text-muted-foreground text-xs ml-2">· {l.professor_name}</span>
                          )}
                          {l.room && (
                            <span className="text-muted-foreground text-xs ml-2">· {l.room}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => remove(l.id)}
                        aria-label={`Delete ${l.subject_name}`}
                        className="ml-4 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <Card>
              <EmptyState icon={<Clock size={28} strokeWidth={1.5} />} title={`No lectures for Year ${year}`} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
