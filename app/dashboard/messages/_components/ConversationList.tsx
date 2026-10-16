'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MessagesSquare } from 'lucide-react';
import { initials, personLine, type Conversation } from './types';

// The left pane: one row per thread, newest first, unread ones in bold.
export function ConversationList({
  conversations,
  loading,
  activeId,
  onSelect,
}: {
  conversations: Conversation[];
  loading: boolean;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare size={28} strokeWidth={1.5} />}
        title="No conversations yet"
        message="Start one with New message."
      />
    );
  }

  return (
    <ul className="p-2 space-y-0.5">
      {conversations.map(c => {
        const active = c.id === activeId;
        const unread = c.unread > 0 && !active;
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                active ? 'bg-primary-soft' : 'hover:bg-accent',
              )}
            >
              <Avatar className="size-9">
                {c.other.avatar_url ? <AvatarImage src={c.other.avatar_url} alt="" /> : null}
                <AvatarFallback className="text-xs font-medium text-foreground">{initials(c.other.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn('truncate text-sm', unread ? 'font-semibold text-foreground' : 'text-foreground')}>{c.other.name}</p>
                  {c.last_message_at && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(c.last_message_at)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('truncate text-xs', unread ? 'text-foreground' : 'text-muted-foreground')}>
                    {c.last_message_preview || personLine(c.other)}
                  </p>
                  {unread && (
                    <span className="min-w-5 shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-primary-foreground tabular-nums">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
