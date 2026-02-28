import type { ContentBlock, PruneOptions, Session } from '../types.js';
import { readFile, writeFile } from 'node:fs/promises';
import {
  hasContent,
  isToolBlock,
  MIN_TEXT_LENGTH,
  SYSTEM_TAGS,
  textLength,
} from '../sessions/analyze-prune.js';

const stripTagsFromText = (text: string): string => {
  let result = text;

  for (const tag of SYSTEM_TAGS) {
    const open = `<${tag}>`;
    const close = `</${tag}>`;

    scan: while (true) {
      const start = result.indexOf(open);
      if (start === -1) break scan;

      const end = result.indexOf(close, start + open.length);
      if (end === -1) break scan;

      result = result.slice(0, start) + result.slice(end + close.length);
    }
  }

  return result;
};

const stripSystemTags = (blocks: ContentBlock[]): ContentBlock[] =>
  blocks.flatMap((block) => {
    if (block.type !== 'text' || !block.text) return [block];

    const stripped = stripTagsFromText(block.text).trim();
    return stripped ? [{ ...block, text: stripped }] : [];
  });

const filterContent = (
  content: ContentBlock[],
  options: PruneOptions
): ContentBlock[] => {
  let filtered = content;

  if (options.toolBlocks) {
    filtered = filtered.filter((block) => !isToolBlock(block));
  }

  if (options.systemTags) {
    filtered = stripSystemTags(filtered);
  }

  return filtered;
};

const shouldSkipMessage = (
  type: string,
  content: ContentBlock[],
  options: PruneOptions
): boolean => {
  if (options.emptyMessages && content.length === 0) return true;

  if (
    options.shortMessages &&
    type === 'assistant' &&
    textLength(content) < MIN_TEXT_LENGTH
  )
    return true;

  return false;
};

const repairParentChain = (
  lines: string[],
  survivingUuids: Set<string>
): string[] => {
  let lastUuid: string | undefined;

  return lines.map((line) => {
    try {
      const parsed = JSON.parse(line);

      if (!parsed.uuid) return line;

      if (parsed.parentUuid && !survivingUuids.has(parsed.parentUuid)) {
        parsed.parentUuid = lastUuid ?? parsed.parentUuid;
        lastUuid = parsed.uuid;
        return JSON.stringify(parsed);
      }

      lastUuid = parsed.uuid;
      return line;
    } catch {
      return line;
    }
  });
};

export const prune = async (
  session: Session,
  options: PruneOptions
): Promise<void> => {
  const raw = await readFile(session.file, 'utf-8');
  const lines = raw.split('\n');
  const kept: string[] = [];
  const survivingUuids = new Set<string>();

  let lastTitleIndex = -1;

  if (options.customTitles) {
    for (let index = 0; index < lines.length; index++) {
      try {
        const parsed = JSON.parse(lines[index] ?? '');
        if (parsed.type === 'custom-title') lastTitleIndex = index;
      } catch {}
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'custom-title' && index !== lastTitleIndex) continue;

      if (hasContent(parsed)) {
        const content = filterContent(parsed.message.content, options);

        if (shouldSkipMessage(parsed.type, content, options)) continue;

        parsed.message.content = content;
        if (parsed.uuid) survivingUuids.add(parsed.uuid);
        kept.push(JSON.stringify(parsed));
        continue;
      }

      if (parsed.uuid) survivingUuids.add(parsed.uuid);
      kept.push(line);
    } catch {
      kept.push(line);
    }
  }

  const repaired = repairParentChain(kept, survivingUuids);
  await writeFile(session.file, repaired.join('\n') + '\n');
};
