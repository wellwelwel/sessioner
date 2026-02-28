import { readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

export const getEntries = async (dir: string): Promise<Map<string, Date>> => {
  try {
    const names = await readdir(dir);
    const jsonl = names.filter((name) => name.endsWith('.jsonl'));

    const files = await Promise.all(
      jsonl.map(async (name) => {
        const path = join(dir, name);
        const { mtime } = await stat(path);
        return { file: path, mtime };
      })
    );

    files.sort(
      (first, second) => second.mtime.getTime() - first.mtime.getTime()
    );

    const entries = new Map<string, Date>();

    for (const { file, mtime } of files) {
      const id = basename(file, '.jsonl');
      if (id.startsWith('agent-')) continue;

      entries.set(file, mtime);
    }

    return entries;
  } catch {
    return new Map();
  }
};
