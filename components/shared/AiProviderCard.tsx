'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Provider = 'anthropic' | 'gemini';
type AiStatus = {
  provider: Provider;
  providers: Record<Provider, { configured: boolean; model: string | null }>;
};

type ApiError = { response?: { data?: { error?: string } } };
const errorText = (e: unknown, fallback: string) => (e as ApiError)?.response?.data?.error || fallback;

const OPTIONS: { key: Provider; name: string; hint: string }[] = [
  { key: 'gemini', name: 'Google Gemini', hint: 'Free tier, rate limited' },
  { key: 'anthropic', name: 'Anthropic Claude', hint: 'Paid, needs API credits' },
];

// Which AI the study tools (paper reading, quizzes, flashcards, planner) use.
// Admins can see it; only the super admin can switch.
export function AiProviderCard({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Provider | null>(null);

  const fetchStatus = useCallback(() =>
    api.get('/settings/ai')
      .then(r => { setStatus(r.data); setError(''); })
      .catch(e => setError(errorText(e, 'Could not load the AI setting'))), []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const retry = () => { setError(''); fetchStatus(); };

  const choose = async (provider: Provider) => {
    if (!status || provider === status.provider || !canEdit) return;
    setSaving(provider);
    try {
      const r = await api.put('/settings/ai', { provider });
      setStatus(r.data);
      toast.success(`Study tools now use ${provider === 'gemini' ? 'Gemini' : 'Claude'}`);
    } catch (e) {
      toast.error(errorText(e, 'Could not switch provider'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <p className="label">AI provider</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Used for reading past papers, quizzes, flashcards and study plans.
          {!canEdit && ' Only the super admin can change this.'}
        </p>
        {error ? (
          <ErrorBanner message={error} onRetry={retry} />
        ) : !status ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div role="radiogroup" aria-label="AI provider" className="grid gap-3 sm:grid-cols-2">
            {OPTIONS.map(({ key, name, hint }) => {
              const info = status.providers[key];
              const active = status.provider === key;
              const disabled = !canEdit || !info.configured || saving !== null;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled && !active}
                  onClick={() => choose(key)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    active ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted',
                    disabled && !active && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{name}</span>
                    {saving === key ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : active ? (
                      <StatusPill tone="accent">In use</StatusPill>
                    ) : !info.configured ? (
                      <StatusPill tone="neutral">Key not set</StatusPill>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                  {info.model && <span className="mt-2 block font-mono text-xs text-muted-foreground">{info.model}</span>}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
