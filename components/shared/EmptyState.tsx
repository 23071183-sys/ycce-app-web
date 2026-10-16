import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shown when a list has nothing in it: what belongs here, and the action that
// fills it if there is one.
export function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <span className="text-muted-foreground">{icon ?? <Inbox size={28} strokeWidth={1.5} />}</span>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
