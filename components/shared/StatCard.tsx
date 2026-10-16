import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/format';

const VALUE_TONE: Record<Tone, string> = {
  neutral: 'text-foreground',
  accent: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

// One headline number with its label, e.g. "PENDING APPROVALS 12".
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0', className)}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="label">{label}</p>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
        <p className={cn('num-display mt-2 text-4xl', VALUE_TONE[tone])}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
