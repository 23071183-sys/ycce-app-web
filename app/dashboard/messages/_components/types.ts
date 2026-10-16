export type Person = {
  id: number;
  name: string;
  role: string;
  avatar_url: string | null;
  year?: number | null;
  roll_number?: string | null;
};

export type Conversation = {
  id: number;
  kind: string;
  other: Person;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread: number;
};

// Message ids are BIGSERIAL, which the API sends as strings; they are turned
// into numbers on arrival. A message still on its way has no id yet.
export type Message = {
  id: number | null;
  sender_id: number;
  body: string;
  client_id: string | null;
  created_at: string;
  state?: 'sending' | 'failed';
};

export type RawMessage = { id: number | string; sender_id: number | string; body: string; client_id: string | null; created_at: string };

export const toMessage = (m: RawMessage): Message => ({
  id: Number(m.id),
  sender_id: Number(m.sender_id),
  body: m.body,
  client_id: m.client_id,
  created_at: m.created_at,
});

// Fired on window after a thread is read, so the sidebar badge refreshes now
// rather than at its next poll.
export const MESSAGES_READ_EVENT = 'messages-read';

export const initials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const personLine = (p: Person) =>
  p.role === 'student'
    ? [p.roll_number, p.year ? `Year ${p.year}` : null].filter(Boolean).join(' · ')
    : p.role === 'super_admin' || p.role === 'admin' ? 'Admin' : p.role === 'professor' ? 'Professor' : p.role;
