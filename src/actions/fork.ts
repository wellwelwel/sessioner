import type { Session } from '../types.js';
import { randomUUID } from 'node:crypto';
import {
  cp,
  rename as fsRename,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { rewriteJsonl } from '../sessions/rewrite-jsonl.js';

export const fork = async (
  session: Session,
  title: string
): Promise<Session> => {
  const id = randomUUID();
  const dir = dirname(session.file);
  const file = join(dir, `${id}.jsonl`);
  const sourceId = basename(session.file, '.jsonl');
  const raw = await readFile(session.file, 'utf-8');
  const sourceDir = join(dir, sourceId);
  const targetDir = join(dir, id);

  await writeFile(file, rewriteJsonl(raw, id));

  try {
    await cp(sourceDir, targetDir, { recursive: true });

    const subagentsDir = join(targetDir, 'subagents');
    const entries = await readdir(subagentsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;

      const path = join(subagentsDir, entry);
      const subagentId = randomUUID();
      const content = await readFile(path, 'utf-8');

      await writeFile(path, rewriteJsonl(content, subagentId));
      await fsRename(path, join(subagentsDir, `${subagentId}.jsonl`));
    }
  } catch {}

  return { id, date: '', message: title, file };
};
