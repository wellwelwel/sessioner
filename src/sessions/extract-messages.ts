import type { Session } from '../types.js';
import { readFile } from 'node:fs/promises';

export const extractMessages = async (
  session: Session
): Promise<{ total: number; lines: [number, string][] }> => {
  const raw = await readFile(session.file, 'utf-8');
  const rawLines = raw.split('\n');
  const lines: [number, string][] = [];
  let ordinal = 0;

  for (const line of rawLines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.type !== 'user' && parsed.type !== 'assistant') continue;

      const role = parsed.type === 'user' ? '[ YOU ]' : '[ LLM ]';
      const content = parsed.message?.content ?? [];
      let text = '';

      for (const block of content) {
        if (block.type === 'text' && block.text) {
          text = block.text;
          break;
        }

        if (block.type === 'tool_result' && block.content) {
          if (typeof block.content === 'string') {
            text = block.content;
            break;
          }

          if (Array.isArray(block.content)) {
            const sub = block.content.find(
              (item: { text?: string }) => item.text
            );
            if (sub) text = sub.text;
            break;
          }
        }
      }

      text = text.replace(/\r?\n/g, ' ').trim().replace(/ {2,}/g, ' ');

      if (text) lines.push([ordinal, `${role} ${text}`]);
      ordinal++;
    } catch {}
  }

  return { total: ordinal, lines: lines.reverse() };
};
