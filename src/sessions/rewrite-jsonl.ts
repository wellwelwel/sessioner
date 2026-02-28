import { randomUUID } from 'node:crypto';

export const rewriteJsonl = (content: string, sessionId: string): string => {
  const lines = content.split('\n');
  const uuidMap = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      if (parsed.uuid) uuidMap.set(parsed.uuid, randomUUID());
    } catch {}
  }

  return lines
    .map((line) => {
      if (!line.trim()) return line;

      try {
        const parsed = JSON.parse(line);

        if (parsed.uuid) parsed.uuid = uuidMap.get(parsed.uuid);
        if (parsed.parentUuid)
          parsed.parentUuid = uuidMap.get(parsed.parentUuid) ?? randomUUID();
        if (parsed.sessionId) parsed.sessionId = sessionId;

        return JSON.stringify(parsed);
      } catch {
        return line;
      }
    })
    .join('\n');
};
