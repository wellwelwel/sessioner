import type { ContentBlock, PruneStats, Session } from '../types.js';
import { readFile } from 'node:fs/promises';

export const MIN_TEXT_LENGTH = 50;

export const SYSTEM_TAGS = [
  'ide_selection',
  'ide_opened_file',
  'system-reminder',
] as const;

export const isToolBlock = (block: ContentBlock): boolean =>
  block.type === 'tool_use' || block.type === 'tool_result';

export const textLength = (blocks: ContentBlock[]): number => {
  let length = 0;

  for (const block of blocks) {
    if (block.type !== 'text' || !block.text) continue;
    length += block.text.trim().length;
  }

  return length;
};

export const hasContent = (parsed: {
  type?: string;
  message?: { content?: unknown[] };
}): boolean =>
  (parsed.type === 'assistant' || parsed.type === 'user') &&
  Array.isArray(parsed.message?.content);

const countTagsInText = (text: string): number => {
  let count = 0;

  for (const tag of SYSTEM_TAGS) {
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    let position = 0;

    scan: while (true) {
      const start = text.indexOf(open, position);
      if (start === -1) break scan;

      const end = text.indexOf(close, start + open.length);
      if (end === -1) break scan;

      count++;
      position = end + close.length;
    }
  }

  return count;
};

const countSystemTags = (blocks: ContentBlock[]): number => {
  let count = 0;

  for (const block of blocks) {
    if (block.type !== 'text' || !block.text) continue;
    count += countTagsInText(block.text);
  }

  return count;
};

export const analyze = async (session: Session): Promise<PruneStats> => {
  const raw = await readFile(session.file, 'utf-8');
  const lines = raw.split('\n');
  let toolBlocks = 0;
  let shortMessages = 0;
  let emptyMessages = 0;
  let systemTags = 0;
  let titleLines = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'custom-title') {
        titleLines++;
        continue;
      }

      if (!hasContent(parsed)) continue;

      const content: ContentBlock[] = parsed.message.content;
      const tools = content.filter((block) => isToolBlock(block));

      toolBlocks += tools.length;
      systemTags += countSystemTags(content);

      const filtered = content.filter((block) => !isToolBlock(block));

      if (filtered.length === 0) {
        emptyMessages++;
        continue;
      }

      if (parsed.type === 'assistant' && textLength(filtered) < MIN_TEXT_LENGTH)
        shortMessages++;
    } catch {}
  }

  const customTitles = Math.max(0, titleLines - 1);

  return { toolBlocks, shortMessages, emptyMessages, systemTags, customTitles };
};
