import type { ListResult, Session } from '../types.js';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { formatDate } from '../helpers/format-date.js';
import { extractFirstUserMessage } from './extract-first-user-message.js';
import { getEntries } from './get-entries.js';

const defaultBase = join(homedir(), '.claude', 'projects');

export const listSessions = async (
  path?: string,
  base?: string
): Promise<ListResult> => {
  const projectDir = join(
    base ?? defaultBase,
    (path ?? process.cwd()).replace(/[^a-zA-Z0-9]/g, '-')
  );

  const entries = await getEntries(projectDir);
  const sessions: Session[] = [];
  const empty: string[] = [];

  const results = await Promise.all(
    [...entries].map(async ([file, mtime]) => {
      const message = await extractFirstUserMessage(file);
      return { file, mtime, message };
    })
  );

  for (const { file, mtime, message } of results) {
    if (!message) {
      empty.push(file);
      continue;
    }

    sessions.push({
      id: basename(file, '.jsonl'),
      date: formatDate(mtime),
      message,
      file,
    });
  }

  return { sessions, empty };
};
