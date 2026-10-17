import type { ReactNode } from 'react';

// The small slice of Markdown the AI assistant writes: **bold**, *italic*,
// `code`, [links](url), "- " / "* " / "1. " list items, "#" headings and
// simple | tables |. Anything else shows as plain text. Built as React
// elements (no HTML strings), so model output can't inject markup.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{link[1]}</a>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export function ChatText({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    // A table: header row, a |---| separator, then body rows.
    if (line.trim().startsWith('|') && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || '')) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      i--;
      out.push(
        <div key={`t${i}`} className="my-1 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{head.map((h, j) => <th key={j} className="border-b border-border px-2 py-1 text-left font-medium">{inline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-border px-2 py-1">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (!line.trim()) { out.push(<div key={i} className="h-2" />); continue; }
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) { out.push(<p key={i} className="font-semibold">{inline(heading[1])}</p>); continue; }
    const bullet = /^(\s*)[-*•]\s+(.*)$/.exec(line);
    const numbered = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const indent = Math.min(Math.floor((bullet || numbered)![1].length / 2), 3);
      out.push(
        <div key={i} className="flex gap-2" style={{ paddingLeft: indent * 12 }}>
          <span className="shrink-0 text-muted-foreground">{bullet ? '•' : `${numbered![2]}.`}</span>
          <span className="min-w-0">{inline(bullet ? bullet[2] : numbered![3])}</span>
        </div>
      );
      continue;
    }
    out.push(<p key={i}>{inline(line)}</p>);
  }
  return <div className="space-y-0.5 whitespace-normal">{out}</div>;
}
