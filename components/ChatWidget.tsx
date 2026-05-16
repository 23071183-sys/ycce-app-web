'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ArrowUp, Loader2 } from 'lucide-react';
import api from '@/lib/api';

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

      const { data } = await api.post('/chat/dashboard', { messages: apiMessages });
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
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Open AI assistant"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-22 right-6 z-50 w-[370px] max-h-[600px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background text-[10px] font-bold">CT</span>
            </div>
            <span className="text-sm font-medium text-foreground tracking-wide">Developer Assistant</span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
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
                      <div className="w-4 h-4 rounded bg-foreground flex items-center justify-center">
                        <span className="text-background text-[8px] font-bold">CT</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Assistant</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap font-light ${
                      isUser
                        ? 'bg-foreground text-background rounded-br-sm'
                        : 'bg-muted text-foreground border border-border rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start gap-1.5">
                <div className="w-4 h-4 rounded bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-background text-[8px] font-bold">CT</span>
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Try asking</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-3 py-1.5 hover:text-foreground hover:border-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-border bg-card shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 resize-none bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors max-h-24 font-light"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 bg-foreground text-background hover:opacity-80"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
