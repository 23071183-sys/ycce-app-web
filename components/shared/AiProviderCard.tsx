'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/shared/StatusPill';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { SelectField } from '@/components/shared/SelectField';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Provider = 'anthropic' | 'gemini';
type AiStatus = {
  provider: Provider;
  providers: {
    anthropic: { configured: boolean; model: string | null };
    gemini: {
      configured: boolean; model: string | null; pinned: string | null;
      pinned_by_env: boolean; models: string[]; cooling: string[];
    };
  };
};
type TestResult = { ok: boolean; model: string | null; ms: number; error?: string; detail?: string | null };

const AUTO = '__auto__';

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
  const [savingModel, setSavingModel] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);

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

  const pinModel = async (value: string) => {
    setSavingModel(true);
    try {
      const r = await api.put('/settings/ai', { gemini_model: value === AUTO ? null : value });
      setStatus(r.data);
      toast.success(value === AUTO ? 'Gemini model set to automatic' : `Gemini now uses ${value}`);
    } catch (e) {
      toast.error(errorText(e, 'Could not change the model'));
    } finally {
      setSavingModel(false);
    }
  };

  // A real call with the quiz format, so it shows how a student request would go.
  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const r = await api.post('/settings/ai/test?tool=quiz', undefined, { timeout: 200000, skipWakeRetry: true });
      setTest(r.data);
      fetchStatus();
    } catch (e) {
      setTest({ ok: false, model: null, ms: 0, error: errorText(e, 'The test request failed') });
    } finally {
      setTesting(false);
    }
  };

  const gemini = status?.providers.gemini;

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

        {status && gemini?.configured && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Gemini model</p>
                <p className="text-xs text-muted-foreground">
                  {gemini.pinned_by_env
                    ? 'Fixed by GEMINI_MODEL on the server.'
                    : 'Automatic skips models that are overloaded. Pin one if a model works best.'}
                </p>
              </div>
              <SelectField
                aria-label="Gemini model"
                className="sm:w-60"
                value={gemini.pinned ?? AUTO}
                disabled={!canEdit || gemini.pinned_by_env || savingModel}
                onValueChange={pinModel}
                options={[
                  { value: AUTO, label: 'Automatic' },
                  ...gemini.models.map(m => ({
                    value: m,
                    label: gemini.cooling.includes(m) ? `${m} (busy)` : m,
                  })),
                ]}
              />
            </div>
          </div>
        )}

        {status && canEdit && (
          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              {testing ? (
                <span className="text-muted-foreground">Asking {status.provider === 'gemini' ? 'Gemini' : 'Claude'} for a sample quiz…</span>
              ) : test ? (
                <span className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={test.ok ? 'success' : 'danger'}>{test.ok ? 'Working' : 'Failed'}</StatusPill>
                  <span className="text-muted-foreground">
                    {test.model ? `${test.model} · ` : ''}{(test.ms / 1000).toFixed(1)}s
                  </span>
                  {!test.ok && <span className="w-full text-xs text-destructive break-words">{test.error}{test.detail ? ` — ${test.detail}` : ''}</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">Check the provider answers in time for students.</span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={runTest} disabled={testing}>
              {testing && <Loader2 className="size-4 animate-spin" />}
              Test connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
