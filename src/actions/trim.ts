import type { Session } from '../types.js';
import { readFile, writeFile } from 'node:fs/promises';

export const trim = async (
  session: Session,
  keepCount: number
): Promise<void> => {
  const raw = await readFile(session.file, 'utf-8');
  const lines = raw.split('\n');
  let seen = 0;
  let cutIndex = lines.length;

  for (let index = 0; index < lines.length; index++) {
    const current = lines[index];
    if (!current?.trim()) continue;

    try {
      const parsed = JSON.parse(current);
      const isMessage = parsed.type === 'user' || parsed.type === 'assistant';

      if (!isMessage) continue;

      seen++;

      if (seen > keepCount) {
        cutIndex = index;
        break;
      }
    } catch {}
  }

  const kept = lines.slice(0, cutIndex).filter((line) => line.trim());

  await writeFile(session.file, kept.join('\n') + '\n');
};
