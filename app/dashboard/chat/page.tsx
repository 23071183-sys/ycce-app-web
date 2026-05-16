'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

const SUGGESTIONS = [
  'Show all professors and their subjects',
  'Show attendance report for all students',
  'List students with attendance below 75%',
  'Show assignment submission stats',
  'List all students in Year 3',
  'Show all announcements',
  'Show all DB tables and columns',
  'Read attendanceController.js',
];

type Message = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const user = getUser();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const greeting = isAdmin
    ? `Hi ${user?.name?.split(' ')[0] || 'Admin'}! 🛠️ I'm your YCCE developer assistant.\n\nI can read and fix backend files, run DB queries, fetch live college data — professors, attendance, students, assignments — just ask.`
    : `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your YCCE assistant.\n\nAsk me anything about students, attendance, announcements, or assignments.`;

  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const reset = () => setMessages([{ role: 'assistant', content: greeting }]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-light tracking-widest uppercase text-foreground">AI Assistant</h1>
          <p className="text-muted-foreground text-xs mt-0.5 tracking-wide">
            {isAdmin ? 'Developer mode — full backend access' : 'College data assistant'}
          </p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors hover:bg-muted">
          <RefreshCw size={12} />
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 min-h-0">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isUser ? 'bg-foreground' : 'bg-muted border border-border'
              }`}>
                {isUser
                  ? <span className="text-background text-[10px] font-bold">{user?.name?.charAt(0) || 'U'}</span>
                  : <span className="text-foreground text-[10px] font-bold">CT</span>
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? 'bg-foreground text-background rounded-tr-sm'
                  : 'bg-card border border-border text-foreground rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
              <span className="text-foreground text-[10px] font-bold">CT</span>
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={14} className="text-muted-foreground animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions — only at start */}
      {messages.length === 1 && (
        <div className="shrink-0 pb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs text-muted-foreground bg-card border border-border rounded-full px-3 py-1.5 hover:text-foreground hover:border-foreground/40 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border pt-4">
        <div className="flex items-end gap-3 bg-card border border-border rounded-xl px-4 py-3 focus-within:border-foreground/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32"
            style={{ scrollbarWidth: 'none' }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 bg-foreground text-background hover:opacity-80">
            <ArrowUp size={14} />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2 tracking-wide">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
