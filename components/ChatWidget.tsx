'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ArrowUp, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatText } from '@/components/shared/ChatText';

const SUGGESTIONS = [
  'Show all professors and their subjects',
  'Show attendance report for all students',
  'List students with attendance below 75%',
  'Show assignment submission stats',
  'List all students in Year 3',
  'Show notes posted by professors',
  'Show all announcements',
  'Show all DB tables and columns',
];

type Message = { role: 'user' | 'assistant'; content: string };

const greeting =
  "Hi! 🛠️ I'm your YCCE developer assistant.\n\nI can read and fix backend files, run DB queries, inspect routes, and diagnose issues — just describe the problem.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: greeting },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  const send = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: userText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const apiMessages = updated
        .filter((m, i) => !(m.role === 'assistant' && i === 0))
        .map(m => ({ role: m.role, content: m.content }));

      const { data } = await api.post('/chat/dashboard', { messages: apiMessages }, { timeout: 150000 });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 size-12 rounded-full shadow-lg [&_svg:not([class*='size-'])]:size-5"
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
      >
        {open ? <X /> : <MessageCircle />}
      </Button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-50 w-[min(370px,calc(100vw-2rem))] max-h-[min(600px,calc(100vh-8rem))] flex flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
            <div className="w-6 h-6 rounded-md bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
              CT
            </div>
            <span className="text-sm font-medium text-foreground">Developer Assistant</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto text-muted-foreground">
              <X />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={i}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-4 h-4 rounded bg-foreground text-background flex items-center justify-center text-[8px] font-bold">
                        CT
                      </div>
                      <span className="label text-[10px]">Assistant</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground border border-border rounded-bl-sm',
                    )}
                  >
                    {isUser ? msg.content : <ChatText text={msg.content} />}
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start gap-1.5">
                <div className="w-4 h-4 rounded bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-bold">
                  CT
                </div>
                <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 size={14} className="text-muted-foreground animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 shrink-0">
              <p className="label text-[10px] mb-2">Try asking</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <Button
                    key={s}
                    variant="outline"
                    size="xs"
                    onClick={() => send(s)}
                    className="rounded-full font-normal text-muted-foreground"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-border shrink-0">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              rows={1}
              aria-label="Message"
              className="flex-1 min-h-9 max-h-24 resize-none rounded-xl"
              style={{ scrollbarWidth: 'none' }}
            />
            <Button
              size="icon-lg"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              aria-label="Send"
              className="rounded-full"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
