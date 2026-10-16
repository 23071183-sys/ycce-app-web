'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowUp, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { initials, personLine, type Conversation, type Message } from './types';

const MAX_LENGTH = 4000;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

const dayKey = (iso: string) => new Date(iso).toDateString();

// The right pane: the open conversation, oldest at the top, and the composer.
export function Thread({
  conversation,
  messages,
  myId,
  otherLastRead,
  loading,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onSend,
  onRetry,
  onBack,
}: {
  conversation: Conversation | null;
  messages: Message[];
  myId: number;
  otherLastRead: number;
  loading: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onSend: (body: string) => void;
  onRetry: (message: Message) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Follow the newest message; loading older ones above doesn't change the
  // last message, so it doesn't yank the view.
  const last = messages[messages.length - 1];
  const lastKey = last ? `${last.client_id ?? ''}:${last.id ?? ''}` : '';
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lastKey, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState icon={<MessageSquare size={28} strokeWidth={1.5} />} title="Select a conversation" message="Or start a new one with New message." />
      </div>
    );
  }

  const send = () => {
    const body = draft.trim();
    if (!body || body.length > MAX_LENGTH) return;
    onSend(body);
    setDraft('');
  };

  // "Seen" belongs under my latest delivered message once the other person's
  // read marker has reached it.
  let myLastIndex = -1;
  messages.forEach((m, i) => { if (m.sender_id === myId && m.id !== null) myLastIndex = i; });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Back to conversations" className="md:hidden">
          <ArrowLeft />
        </Button>
        <Avatar className="size-8">
          {conversation.other.avatar_url ? <AvatarImage src={conversation.other.avatar_url} alt="" /> : null}
          <AvatarFallback className="text-xs font-medium text-foreground">{initials(conversation.other.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{conversation.other.name}</p>
          <p className="truncate text-xs text-muted-foreground">{personLine(conversation.other)}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {hasMore && (
              <div className="mb-4 flex justify-center">
                <Button variant="ghost" size="sm" onClick={onLoadOlder} disabled={loadingOlder} className="text-muted-foreground">
                  {loadingOlder ? <Loader2 className="animate-spin" /> : null}
                  Load earlier messages
                </Button>
              </div>
            )}
            {messages.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
            )}
            <div className="space-y-1.5">
              {messages.map((m, i) => {
                const mine = m.sender_id === myId;
                const newDay = i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at);
                return (
                  <div key={m.client_id ?? `id-${m.id}`}>
                    {newDay && (
                      <p className="label my-4 text-center">{fmtDate(m.created_at)}</p>
                    )}
                    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                          mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border bg-muted text-foreground',
                          m.state === 'sending' && 'opacity-60',
                          m.state === 'failed' && 'bg-destructive-soft text-destructive',
                        )}
                      >
                        {m.body}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                        {m.state === 'failed' ? (
                          <button onClick={() => onRetry(m)} className="flex items-center gap-1 text-destructive hover:underline">
                            <RotateCcw size={11} /> Not sent · Retry
                          </button>
                        ) : m.state === 'sending' ? (
                          <span>Sending…</span>
                        ) : (
                          <>
                            <span>{timeOf(m.created_at)}</span>
                            {i === myLastIndex && (
                              <span>· {m.id !== null && m.id <= otherLastRead ? 'Seen' : 'Sent'}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${conversation.other.name.split(' ')[0]}…`}
            aria-label="Message"
            rows={1}
            maxLength={MAX_LENGTH}
            className="min-h-9 max-h-32 resize-none"
          />
          <Button size="icon-lg" onClick={send} disabled={!draft.trim()} aria-label="Send" className="rounded-full">
            <ArrowUp />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}
