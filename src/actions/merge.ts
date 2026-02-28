import type { Session } from '../types.js';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { rewriteJsonl } from '../sessions/rewrite-jsonl.js';

const buildUuidMap = (lines: string[]): Map<string, string> => {
  const uuidMap = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'session_title' || parsed.type === 'custom-title')
        continue;
      if (parsed.uuid) uuidMap.set(parsed.uuid, randomUUID());
    } catch {}
  }

  return uuidMap;
};

const remapSession = (
  lines: string[],
  uuidMap: Map<string, string>,
  sessionId: string,
  previousLastUuid: string | undefined
): { mapped: string[]; lastUuid: string | undefined } => {
  const mapped: string[] = [];
  let lastUuid: string | undefined;

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'session_title' || parsed.type === 'custom-title')
        continue;

      if (parsed.uuid) {
        const newUuid = uuidMap.get(parsed.uuid);
        if (newUuid) {
          parsed.uuid = newUuid;
          lastUuid = newUuid;
        }
      }

      if (parsed.parentUuid) {
        const remapped = uuidMap.get(parsed.parentUuid);
        parsed.parentUuid = remapped ?? previousLastUuid ?? randomUUID();
      } else if (previousLastUuid && parsed.uuid) {
        parsed.parentUuid = previousLastUuid;
      }

      if (parsed.sessionId) parsed.sessionId = sessionId;

      mapped.push(JSON.stringify(parsed));
    } catch {
      mapped.push(line);
    }
  }

  return { mapped, lastUuid };
};

const mergeJsonl = (contents: string[], sessionId: string): string => {
  const allLines: string[] = [];
  let lastUuid: string | undefined;

  for (const content of contents) {
    const lines = content.split('\n');
    const uuidMap = buildUuidMap(lines);
    const result = remapSession(lines, uuidMap, sessionId, lastUuid);

    allLines.push(...result.mapped);
    if (result.lastUuid) lastUuid = result.lastUuid;
  }

  return allLines.join('\n');
};

const copySubagents = async (
  sourceSessions: Session[],
  targetDir: string
): Promise<void> => {
  const subagentsDir = join(targetDir, 'subagents');

  for (const session of sourceSessions) {
    const sourceId = basename(session.file, '.jsonl');
    const sourceSubagents = join(dirname(session.file), sourceId, 'subagents');

    try {
      const entries = await readdir(sourceSubagents);

      for (const entry of entries) {
        if (!entry.endsWith('.jsonl')) continue;

        const sourcePath = join(sourceSubagents, entry);
        const subagentId = randomUUID();
        const content = await readFile(sourcePath, 'utf-8');

        await mkdir(subagentsDir, { recursive: true });
        const targetPath = join(subagentsDir, `${subagentId}.jsonl`);
        await writeFile(targetPath, rewriteJsonl(content, subagentId));
      }
    } catch {}
  }
};

export const merge = async (
  sessions: Session[],
  title: string
): Promise<Session> => {
  const sorted = [...sessions].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
  const contents = await Promise.all(
    sorted.map((session) => readFile(session.file, 'utf-8'))
  );

  const first = sorted[0];
  if (!first) return { id: '', date: '', message: title, file: '' };

  const id = randomUUID();
  const dir = dirname(first.file);
  const file = join(dir, `${id}.jsonl`);
  const targetDir = join(dir, id);

  await writeFile(file, mergeJsonl(contents, id));
  await copySubagents(sorted, targetDir);

  return { id, date: '', message: title, file };
};
