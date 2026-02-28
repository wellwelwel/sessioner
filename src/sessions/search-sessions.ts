import type { SearchMatch, Session } from '../types.js';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseLine } from './parse-line.js';

const MIN_TEXT_LENGTH = 5;

const searchSession = (session: Session, query: string): Promise<string[]> =>
  new Promise((resolve) => {
    const stream = createReadStream(session.file, 'utf-8');
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    const matches: string[] = [];
    const lower = query.toLowerCase();

    const close = () => {
      resolve(matches);
      reader.close();
      stream.destroy();
    };

    reader.on('line', (line) => {
      if (!line.trim()) return;

      const entry = parseLine(line);
      if (!entry) return;
      if (entry.type !== 'user' && entry.type !== 'assistant') return;

      const texts = entry.message?.content ?? [];

      for (const block of texts) {
        if (block.type !== 'text' || !block.text) continue;

        const text = block.text
          .replace(/\r?\n/g, ' ')
          .trim()
          .replace(/ {2,}/g, ' ');
        if (text.startsWith('<')) continue;
        if (text.length <= MIN_TEXT_LENGTH) continue;

        if (!text.toLowerCase().includes(lower)) continue;

        const tag = entry.type === 'user' ? '[ YOU ]' : '[ LLM ]';
        matches.push(`${tag} ${text}`);
        break;
      }
    });

    reader.on('close', () => resolve(matches));
    stream.on('error', () => close());
  });

export const searchSessions = async (
  sessions: Session[],
  query: string
): Promise<SearchMatch[]> => {
  const results = await Promise.all(
    sessions.map(async (session) => ({
      session,
      entries: await searchSession(session, query),
    }))
  );

  return results.filter((result) => result.entries.length > 0);
};
