import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Hue, Tone } from '@/lib/format';

// Status tones carry meaning (approved, overdue…); hue tones mark identity
// (a subject's colour, a grade band).
const TONE_CLASSES: Record<Tone | Hue, string> = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-destructive-soft text-destructive',
  teal: 'bg-hue-teal-soft text-hue-teal',
  indigo: 'bg-hue-indigo-soft text-hue-indigo',
  amber: 'bg-hue-amber-soft text-hue-amber',
  rose: 'bg-hue-rose-soft text-hue-rose',
  emerald: 'bg-hue-emerald-soft text-hue-emerald',
  sky: 'bg-hue-sky-soft text-hue-sky',
  violet: 'bg-hue-violet-soft text-hue-violet',
  orange: 'bg-hue-orange-soft text-hue-orange',
};

// A small status label — approval state, attendance band, fee status, grade.
// Uses the soft tokens, so it reads correctly in both light and dark mode.
export function StatusPill({ tone = 'neutral', children, className }: { tone?: Tone | Hue | null; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone ?? 'neutral'],
        className,
      )}
    >
      {children}
    </span>
  );
}
