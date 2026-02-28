import type { Session } from '../types.js';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { bold } from '../helpers/ansi.js';
import { getColumns } from '../helpers/get-columns.js';
import { truncate } from '../helpers/truncate.js';
import { parseLine } from '../sessions/parse-line.js';

const ROLE_LENGTH = 7; // "[ YOU ]" / "[ LLM ]"
const PREVIEW_MARGIN = 10;
const PREFIX_LENGTH = 2 + ROLE_LENGTH + 1 + PREVIEW_MARGIN;
const PREVIEW_LIMIT = 10;
const MIN_TEXT_LENGTH = 5;

export const preview = (
  session: Session,
  limit = PREVIEW_LIMIT
): Promise<string[]> =>
  new Promise((resolve) => {
    const stream = createReadStream(session.file, 'utf-8');
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    const messages: string[] = [];
    const columns = getColumns();

    const close = () => {
      resolve(messages);
      reader.close();
      stream.destroy();
    };

    reader.on('line', (line) => {
      if (!line.trim()) return;

      if (messages.length >= limit) {
        close();
        return;
      }

      const entry = parseLine(line);
      if (!entry) return;
      if (entry.type === 'session_title' || entry.type === 'custom-title')
        return;

      const texts = entry.message?.content ?? [];

      for (const block of texts) {
        if (block.type !== 'text' || !block.text) continue;

        const text = block.text
          .replace(/\r?\n/g, ' ')
          .trim()
          .replace(/ {2,}/g, ' ');
        if (text.startsWith('<')) continue;
        if (text.length <= MIN_TEXT_LENGTH) continue;

        const tag = entry.type === 'user' ? '[ YOU ]' : '[ LLM ]';
        const role = bold(tag);

        const available = columns - PREFIX_LENGTH;
        const truncated =
          available > 0 ? truncate(text, available).trimEnd() : text;

        messages.push(`  ${role} ${truncated}`);
        break;
      }
    });

    reader.on('close', () => resolve(messages));
    stream.on('error', () => close());
  });
