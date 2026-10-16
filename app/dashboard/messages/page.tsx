'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { cn } from '@/lib/utils';
import { PenSquare } from 'lucide-react';
import { ConversationList } from './_components/ConversationList';
import { Thread } from './_components/Thread';
import { NewMessageDialog } from './_components/NewMessageDialog';
import {
  MESSAGES_READ_EVENT, toMessage,
  type Conversation, type Message, type Person, type RawMessage,
} from './_components/types';

const PAGE = 50;
const THREAD_POLL_MS = 5000;
const LIST_POLL_MS = 15000;

const errorText = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;
const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

// Fold server messages into what's on screen: a message matching a pending one
// by client_id replaces it, one already shown is skipped, the rest are added.
// Delivered messages sort by id; anything still pending stays at the end.
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const next = [...current];
  for (const m of incoming) {
    const byClient = m.client_id ? next.findIndex(x => x.client_id === m.client_id) : -1;
    if (byClient >= 0) next[byClient] = m;
    else if (!next.some(x => x.id !== null && x.id === m.id)) next.push(m);
  }
  return next.sort((a, b) => (a.id ?? Infinity) - (b.id ?? Infinity));
}

const lastServerId = (ms: Message[]) => ms.reduce((max, m) => (m.id !== null && m.id > max ? m.id : max), 0);

export default function MessagesPage() {
  const { user } = useCurrentUser();
  const myId = Number(user?.id) || 0;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherLastRead, setOtherLastRead] = useState(0);
  const [loadingThread, setLoadingThread] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);

  // Polls run on timers, so they read the live values through refs.
  const activeRef = useRef<number | null>(null);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { activeRef.current = activeId; }, [activeId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const fetchConversations = useCallback(() => {
    return api.get('/messages/conversations')
      .then(r => { setConversations(r.data); setListError(''); })
      .catch(e => setListError(errorText(e, 'Failed to load conversations')))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    fetchConversations();
    const t = setInterval(() => { if (visible()) fetchConversations(); }, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [fetchConversations]);

  // Move the read marker to the newest message from the other person.
  const markRead = useCallback((conversationId: number, ms: Message[]) => {
    const lastId = lastServerId(ms);
    if (!lastId) return;
    setConversations(cs => cs.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    api.post(`/messages/conversations/${conversationId}/read`, { last_message_id: lastId })
      .then(() => window.dispatchEvent(new Event(MESSAGES_READ_EVENT)))
      .catch(err => console.warn('Could not mark conversation read:', err?.message));
  }, []);

  // Open a thread: the latest page of messages.
  useEffect(() => {
    if (activeId === null) return;
    let cancelled = false;
    api.get(`/messages/conversations/${activeId}/messages`, { params: { limit: PAGE } })
      .then(r => {
        if (cancelled) return;
        const ms: Message[] = (r.data.messages as RawMessage[]).map(toMessage);
        setMessages(ms);
        setOtherLastRead(Number(r.data.otherLastRead) || 0);
        setHasMore(ms.length >= PAGE);
        markRead(activeId, ms);
      })
      .catch(e => { if (!cancelled) toast.error(errorText(e, 'Failed to load messages')); })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [activeId, markRead]);

  // While the tab is visible, fetch anything newer than what's shown.
  useEffect(() => {
    if (activeId === null) return;
    const poll = () => {
      if (!visible() || activeRef.current !== activeId) return;
      const after = lastServerId(messagesRef.current);
      api.get(`/messages/conversations/${activeId}/messages`, { params: { after } })
        .then(r => {
          if (activeRef.current !== activeId) return;
          setOtherLastRead(Number(r.data.otherLastRead) || 0);
          const incoming: Message[] = (r.data.messages as RawMessage[]).map(toMessage);
          if (incoming.length === 0) return;
          setMessages(ms => mergeMessages(ms, incoming));
          if (incoming.some(m => m.sender_id !== myId)) markRead(activeId, incoming);
        })
        .catch(err => console.warn('Message poll failed:', err?.message));
    };
    const t = setInterval(poll, THREAD_POLL_MS);
    const onVisible = () => { if (visible()) poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [activeId, myId, markRead]);

  const openConversation = (id: number) => {
    if (id === activeId) return;
    setMessages([]);
    setOtherLastRead(0);
    setHasMore(false);
    setLoadingThread(true);
    setActiveId(id);
  };

  const loadOlder = async () => {
    if (activeId === null) return;
    const oldest = messages.find(m => m.id !== null)?.id;
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const r = await api.get(`/messages/conversations/${activeId}/messages`, { params: { before: oldest, limit: PAGE } });
      const older: Message[] = (r.data.messages as RawMessage[]).map(toMessage);
      setMessages(ms => mergeMessages(ms, older));
      setHasMore(older.length >= PAGE);
    } catch (e) {
      toast.error(errorText(e, 'Failed to load earlier messages'));
    }
    setLoadingOlder(false);
  };

  // Shown at once, confirmed when the server answers. A retry reuses the
  // client_id, so a send that did land isn't duplicated.
  const send = async (body: string, retryOf?: Message) => {
    const conversationId = activeId;
    if (conversationId === null) return;
    const clientId = retryOf?.client_id ?? crypto.randomUUID();
    const pending: Message = {
      id: null, sender_id: myId, body, client_id: clientId,
      created_at: new Date().toISOString(), state: 'sending',
    };
    setMessages(ms => (retryOf ? ms.map(m => (m.client_id === clientId ? pending : m)) : [...ms, pending]));
    try {
      const r = await api.post(`/messages/conversations/${conversationId}/messages`, { body, client_id: clientId });
      const sent = toMessage(r.data);
      if (activeRef.current === conversationId) setMessages(ms => mergeMessages(ms, [sent]));
      setConversations(cs => {
        const c = cs.find(x => x.id === conversationId);
        if (!c) return cs;
        const updated = { ...c, last_message_at: sent.created_at, last_message_preview: body.slice(0, 140) };
        return [updated, ...cs.filter(x => x.id !== conversationId)];
      });
    } catch (e) {
      const status = statusOf(e);
      toast.error(status === 429 ? errorText(e, 'You are sending messages too fast. Wait a moment.') : errorText(e, 'Message not sent'));
      if (activeRef.current === conversationId) {
        setMessages(ms => ms.map(m => (m.client_id === clientId ? { ...m, state: 'failed' } : m)));
      }
    }
  };

  const startWith = async (person: Person) => {
    setStarting(person.id);
    try {
      const r = await api.post('/messages/conversations', { recipient_id: person.id });
      const id = Number(r.data.id);
      setConversations(cs => (cs.some(c => c.id === id) ? cs : [{
        id, kind: r.data.kind, other: { ...person, ...r.data.other },
        last_message_at: null, last_message_preview: null, unread: 0,
      }, ...cs]));
      setDialogOpen(false);
      openConversation(id);
    } catch (e) {
      toast.error(errorText(e, "Couldn't start the conversation"));
    }
    setStarting(null);
  };

  const active = conversations.find(c => c.id === activeId) ?? null;

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Direct messages with students"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PenSquare /> New message
          </Button>
        }
      />

      {listError && (
        <ErrorBanner
          title="Couldn't load conversations"
          message={listError}
          onRetry={() => { setLoadingList(true); fetchConversations(); }}
        />
      )}

      <Card className="h-[calc(100dvh-14rem)] min-h-[28rem] gap-0 py-0 lg:h-[calc(100dvh-13rem)]">
        <div className="grid h-full min-h-0 md:grid-cols-[18rem_1fr]">
          <div className={cn('min-h-0 overflow-y-auto border-border md:border-r', activeId !== null && 'hidden md:block')}>
            <ConversationList
              conversations={conversations}
              loading={loadingList}
              activeId={activeId}
              onSelect={openConversation}
            />
          </div>
          <div className={cn('min-h-0', activeId === null && 'hidden md:block')}>
            <Thread
              conversation={active}
              messages={messages}
              myId={myId}
              otherLastRead={otherLastRead}
              loading={loadingThread}
              hasMore={hasMore}
              loadingOlder={loadingOlder}
              onLoadOlder={loadOlder}
              onSend={body => send(body)}
              onRetry={m => send(m.body, m)}
              onBack={() => setActiveId(null)}
            />
          </div>
        </div>
      </Card>

      <NewMessageDialog open={dialogOpen} onOpenChange={setDialogOpen} onPick={startWith} starting={starting} />
    </div>
  );
}
