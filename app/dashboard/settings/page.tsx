'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { updateStoredUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { FormField } from '@/components/shared/FormField';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { AiProviderCard } from '@/components/shared/AiProviderCard';
import { Camera, Loader2, Trash2 } from 'lucide-react';

type Prefs = Partial<Record<PrefKey, boolean>>;
type Profile = {
  id: number; name: string; email: string; role: string;
  phone: string | null; bio: string | null; avatar_url: string | null;
  designation?: string | null; department?: string | null;
  notification_prefs: Prefs | null;
};

type PrefKey = 'announcements' | 'lectures' | 'deadlines' | 'messages' | 'fees' | 'placements' | 'events';
const PREFS: { key: PrefKey; label: string; hint: string }[] = [
  { key: 'announcements', label: 'Announcements', hint: 'New notices posted for you' },
  { key: 'lectures', label: 'Lectures', hint: 'Timetable changes and reminders' },
  { key: 'deadlines', label: 'Deadlines', hint: 'Assignments coming due' },
  { key: 'messages', label: 'Messages', hint: 'New direct messages' },
  { key: 'fees', label: 'Fees', hint: 'Fee notices and payment updates' },
  { key: 'placements', label: 'Placements', hint: 'Drives and results' },
  { key: 'events', label: 'Events', hint: 'Fests and department events' },
];

const BIO_MAX = 500;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ROLE_LABEL: Record<string, string> = { super_admin: 'Super admin', admin: 'Admin', professor: 'Professor' };

const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [photoBusy, setPhotoBusy] = useState<'upload' | 'remove' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyProfile = useCallback((p: Profile) => {
    setProfile(p);
    setName(p.name || '');
    setPhone(p.phone || '');
    setBio(p.bio || '');
    updateStoredUser({ name: p.name, avatar_url: p.avatar_url });
  }, []);

  // Only async state updates here, so the first load can run from an effect.
  const fetchProfile = useCallback(() => {
    api.get('/users/me')
      .then(r => { applyProfile(r.data); setLoadError(''); })
      .catch(e => setLoadError(errorText(e, 'Failed to load your profile')))
      .finally(() => setLoading(false));
  }, [applyProfile]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const reload = () => { setLoading(true); setLoadError(''); fetchProfile(); };

  const dirty = !!profile && (name !== (profile.name || '') || phone !== (profile.phone || '') || bio !== (profile.bio || ''));

  const saveProfile = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) { setFormError('Name must be 2 to 100 characters'); return; }
    if (phone.trim() && !/^\+?[0-9 -]{7,20}$/.test(phone.trim())) { setFormError('Enter a valid phone number'); return; }
    setFormError('');
    setSaving(true);
    try {
      const r = await api.put('/users/profile', { name: trimmed, phone: phone.trim(), bio: bio.trim() });
      applyProfile(r.data);
      toast.success('Profile saved');
    } catch (e) {
      setFormError(errorText(e, 'Failed to save your profile'));
    }
    setSaving(false);
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { toast.error('Upload a JPG, PNG, WebP or HEIC image'); return; }
    if (file.size > PHOTO_MAX_BYTES) { toast.error('That photo is over 5 MB'); return; }
    setPhotoBusy('upload');
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const r = await api.post('/users/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      applyProfile(r.data);
      toast.success('Photo updated');
    } catch (e) {
      toast.error(errorText(e, 'Failed to upload the photo'));
    }
    setPhotoBusy(null);
  };

  const removePhoto = async () => {
    setPhotoBusy('remove');
    try {
      const r = await api.delete('/users/profile/photo');
      applyProfile(r.data);
      toast.success('Photo removed');
    } catch (e) {
      toast.error(errorText(e, 'Failed to remove the photo'));
    }
    setPhotoBusy(null);
  };

  // A missing preference counts as on, matching how the server sends pushes.
  const prefOn = (key: PrefKey) => profile?.notification_prefs?.[key] ?? true;

  const togglePref = async (key: PrefKey, value: boolean) => {
    if (!profile) return;
    const previous = profile.notification_prefs;
    setProfile({ ...profile, notification_prefs: { ...(previous || {}), [key]: value } });
    try {
      const r = await api.put('/users/notification-prefs', { [key]: value });
      setProfile(p => (p ? { ...p, notification_prefs: r.data } : p));
    } catch (e) {
      setProfile(p => (p ? { ...p, notification_prefs: previous } : p));
      toast.error(errorText(e, 'Failed to update notifications'));
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Your profile, notifications and appearance" />

      {loadError && <ErrorBanner title="Couldn't load your profile" message={loadError} onRetry={reload} />}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Profile */}
          <Card>
            <CardContent className="space-y-6">
              <p className="label">Profile</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="size-20">
                  {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                  <AvatarFallback className="text-xl font-light text-foreground">{getInitials(profile.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium truncate">{profile.name}</p>
                  <p className="text-muted-foreground text-sm truncate">
                    {profile.email} · {ROLE_LABEL[profile.role] || profile.role}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={PHOTO_TYPES.join(',')}
                      className="hidden"
                      onChange={e => uploadPhoto(e.target.files?.[0])}
                    />
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={photoBusy !== null}>
                      {photoBusy === 'upload' ? <Loader2 className="animate-spin" /> : <Camera />}
                      {profile.avatar_url ? 'Change photo' : 'Upload photo'}
                    </Button>
                    {profile.avatar_url && (
                      <Button variant="ghost" size="sm" onClick={removePhoto} disabled={photoBusy !== null} className="text-muted-foreground hover:text-destructive">
                        {photoBusy === 'remove' ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP or HEIC, up to 5 MB.</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="settings-name">
                  <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
                </FormField>
                <FormField label="Phone" htmlFor="settings-phone" hint="Optional">
                  <Input id="settings-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                </FormField>
              </div>
              <FormField label="Bio" htmlFor="settings-bio">
                <Textarea
                  id="settings-bio"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={BIO_MAX}
                  rows={3}
                  className="min-h-20 resize-none field-sizing-fixed"
                  placeholder="A line about you, shown to students"
                />
                <p className={`text-xs text-right tabular-nums ${bio.length >= BIO_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {bio.length} / {BIO_MAX}
                </p>
              </FormField>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving || !dirty}>
                  {saving ? <Loader2 className="animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardContent>
              <p className="label">Push notifications</p>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">Sent to the mobile app on your phone.</p>
              <div className="divide-y divide-border">
                {PREFS.map(({ key, label, hint }) => (
                  <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-3">
                    <span>
                      <span className="block text-sm text-foreground">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    <Switch checked={prefOn(key)} onCheckedChange={v => togglePref(key, v)} />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="label">Appearance</p>
                <p className="mt-1 text-sm text-muted-foreground">Light, dark, or follow your system setting.</p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          {/* AI provider (admins see it; super admin switches) */}
          {['admin', 'super_admin'].includes(profile.role) && (
            <AiProviderCard canEdit={profile.role === 'super_admin'} />
          )}
        </div>
      ) : null}
    </div>
  );
}
