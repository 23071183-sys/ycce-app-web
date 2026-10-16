'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Megaphone } from 'lucide-react';
import { useCurrentUser } from '@/lib/auth';
import { fmtDate } from '@/lib/format';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { SelectField } from '@/components/shared/SelectField';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { EmptyState } from '@/components/shared/EmptyState';

type Announcement = {
  id: number; title: string; content: string; type: string;
  year?: number; subject_id?: number; subject_name?: string; created_at: string; posted_by_name?: string;
};
type Subject = { id: number; name: string; year: number };


const ALL_TYPES = [
  { value: 'general', label: 'General (All Years)' },
  { value: 'year_specific', label: 'Year Specific' },
  { value: 'subject_specific', label: 'Subject Specific' },
];

const MAX_CONTENT_LENGTH = 1000;

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { role, isAdmin: userIsAdmin } = useCurrentUser();
  const [type, setType] = useState('general');
  useEffect(() => { if (role === 'professor') setType('subject_specific'); }, [role]);
  const [year, setYear] = useState('1');
  const [subjectId, setSubjectId] = useState('');

  const userIsProfessor = role === 'professor';
  const availableTypes = userIsProfessor
    ? ALL_TYPES.filter(t => t.value === 'subject_specific')
    : ALL_TYPES;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      let allItems: Announcement[] = [];
      if (userIsAdmin) {
        const r = await api.get('/announcements/all');
        allItems = r.data;
      } else {
        const requests: Promise<any>[] = [
          api.get('/announcements/general'),
          api.get('/announcements/year/1'),
          api.get('/announcements/year/2'),
          api.get('/announcements/year/3'),
          api.get('/announcements/year/4'),
        ];
        if (userIsProfessor) requests.push(api.get('/subjects/my-subjects'));
        const results = await Promise.all(requests);
        const [general, y1, y2, y3, y4] = results;
        if (userIsProfessor && results[5]) {
          setMySubjects(results[5].data);
          if (results[5].data.length > 0) setSubjectId(String(results[5].data[0].id));
        }
        allItems = [...general.data, ...y1.data, ...y2.data, ...y3.data, ...y4.data];
      }
      const unique = Array.from(new Map(allItems.map((a: Announcement) => [a.id, a])).values())
        .sort((a: Announcement, b: Announcement) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(unique);
    } catch (e: any) {
      setLoadError(e.response?.data?.error || 'Failed to load announcements');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showSuccess = (msg: string) => toast.success(msg);

  const create = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content are required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/announcements', {
        title: title.trim(),
        content: content.trim(),
        type,
        year: type === 'year_specific' ? parseInt(year) : null,
        subject_id: type === 'subject_specific' ? parseInt(subjectId) : null,
      });
      setTitle(''); setContent(''); setType(userIsProfessor ? 'subject_specific' : 'general'); setYear('1'); setSubjectId('');
      setOpen(false);
      await load();
      showSuccess('Announcement posted!');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to post');
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      setItems(prev => prev.filter(a => a.id !== id));
    } catch {
      setLoadError('Failed to delete announcement. Please try again.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Notices for every year, a single year, or one subject"
        actions={['super_admin', 'admin', 'professor'].includes(role) && (
          <Dialog open={open} onOpenChange={v => { setOpen(v); setError(''); }}>
            <DialogTrigger render={<Button />}>
              <Plus /> New
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <FormField label="Type" htmlFor="ann-type">
                  <SelectField id="ann-type" value={type} onValueChange={setType} options={availableTypes} />
                </FormField>
                {type === 'year_specific' && (
                  <FormField label="Year" htmlFor="ann-year">
                    <SelectField
                      id="ann-year"
                      value={year}
                      onValueChange={setYear}
                      options={['1', '2', '3', '4'].map(y => ({ value: y, label: `Year ${y}` }))}
                    />
                  </FormField>
                )}
                {type === 'subject_specific' && (
                  <FormField label="Subject" htmlFor="ann-subject">
                    <SelectField
                      id="ann-subject"
                      value={subjectId}
                      onValueChange={setSubjectId}
                      placeholder="Select subject..."
                      options={mySubjects.map(s => ({ value: String(s.id), label: `${s.name} (Year ${s.year})` }))}
                    />
                  </FormField>
                )}
                <FormField label="Title" htmlFor="ann-title">
                  <Input id="ann-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
                </FormField>
                <FormField label="Content" htmlFor="ann-content">
                  <Textarea
                    id="ann-content"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={4}
                    maxLength={MAX_CONTENT_LENGTH}
                    className="min-h-24 resize-none field-sizing-fixed"
                    placeholder="Write the announcement..."
                  />
                  <p className={`text-xs text-right tabular-nums ${
                    content.length >= MAX_CONTENT_LENGTH
                      ? 'text-destructive'
                      : content.length > MAX_CONTENT_LENGTH * 0.8
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  }`}>
                    {content.length} / {MAX_CONTENT_LENGTH}
                  </p>
                </FormField>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={create} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  {saving ? 'Posting...' : 'Post Announcement'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      />

      {loadError && <ErrorBanner title="Something went wrong" message={loadError} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <Card key={i}>
              <CardContent className="flex items-start gap-4">
                <Skeleton className="w-4 h-4 mt-0.5 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-24 mt-2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={28} strokeWidth={1.5} />}
            title="No announcements yet"
            message='Click "+ New" to post the first announcement'
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <Card key={a.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex gap-3 min-w-0">
                  <Megaphone size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-foreground font-medium text-sm">{a.title}</p>
                      <StatusPill tone={a.type === 'general' ? 'accent' : 'neutral'}>
                        {a.type === 'general' ? 'General' : a.type === 'year_specific' ? `Year ${a.year}` : (a.subject_name || 'Subject')}
                      </StatusPill>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{a.content}</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      {a.posted_by_name && `${a.posted_by_name} · `}
                      {fmtDate(a.created_at)}
                    </p>
                  </div>
                </div>
                {role === 'super_admin' && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(a.id)}
                    aria-label="Delete announcement"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
