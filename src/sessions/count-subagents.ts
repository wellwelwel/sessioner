import type { Session } from '../types.js';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export const countSubagents = async (session: Session): Promise<number> => {
  const id = basename(session.file, '.jsonl');
  const subagentsDir = join(dirname(session.file), id, 'subagents');

  try {
    const entries = await readdir(subagentsDir);
    return entries.length;
  } catch {
    return 0;
  }
};
