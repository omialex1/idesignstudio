import type { ReactNode } from "react";

// Product descriptions are plain text with two light markers, written by the
// admin toolbar: **bold** and *italic* (***both*** also works). Anything else
// stays text, so nothing from the database is ever treated as HTML.
const TOKEN = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;

export function renderRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));

    const [, both, bold, italic] = match;
    if (both !== undefined) {
      nodes.push(
        <strong key={key++}>
          <em>{both}</em>
        </strong>,
      );
    } else if (bold !== undefined) {
      nodes.push(<strong key={key++}>{renderRichText(bold)}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={key++}>{italic}</em>);
    }
    last = index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
