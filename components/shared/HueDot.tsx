import { cn } from '@/lib/utils';
import { hueFor, type Hue } from '@/lib/format';

const DOT: Record<Hue, string> = {
  teal: 'bg-hue-teal',
  indigo: 'bg-hue-indigo',
  amber: 'bg-hue-amber',
  rose: 'bg-hue-rose',
  emerald: 'bg-hue-emerald',
  sky: 'bg-hue-sky',
  violet: 'bg-hue-violet',
  orange: 'bg-hue-orange',
};

// A subject's colour as a small dot. Pass the numeric subject id (never the
// code): every endpoint carries the id, and the mobile app keys hues the same
// way, so a subject is one colour everywhere. Without an id it's neutral.
export function HueDot({ subject, className }: { subject: string | number | null | undefined; className?: string }) {
  const hue = hueFor(subject);
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', hue ? DOT[hue] : 'bg-muted-foreground/40', className)} />;
}
