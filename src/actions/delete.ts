import type { Session } from '../types.js';
import { readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { countSubagents } from '../sessions/count-subagents.js';

export const targets = async (session: Session): Promise<string[]> => {
  const name = basename(session.file);
  const count = await countSubagents(session);
  const items = [name];

  if (count > 0) items.push(`${count} subagent files`);

  return items;
};

const removeFromIndex = async (session: Session): Promise<void> => {
  const path = join(dirname(session.file), 'sessions-index.json');

  try {
    const raw = await readFile(path, 'utf-8');
    const index = JSON.parse(raw);
    const before = index.entries.length;

    index.entries = index.entries.filter(
      (entry: { sessionId: string }) => entry.sessionId !== session.id
    );

    if (index.entries.length < before) {
      await writeFile(path, JSON.stringify(index, null, 2));
    }
  } catch {}
};

export const cleanEmpty = async (files: string[]): Promise<void> => {
  for (const file of files) {
    const id = basename(file, '.jsonl');
    const subagentDir = join(dirname(file), id);

    try {
      await unlink(file);
      await rm(subagentDir, { recursive: true, force: true });
    } catch {}
  }
};

export const remove = async (session: Session): Promise<void> => {
  const id = basename(session.file, '.jsonl');
  const subagentDir = join(dirname(session.file), id);

  try {
    await unlink(session.file);
    await rm(subagentDir, { recursive: true, force: true });
  } catch {}

  await removeFromIndex(session);
};
