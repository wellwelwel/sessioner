import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseLine } from './parse-line.js';

const MIN_TEXT_LENGTH = 5;

const normalizeText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

export const extractFirstUserMessage = (filePath: string): Promise<string> =>
  new Promise((resolve) => {
    const stream = createReadStream(filePath, 'utf-8');
    const reader = createInterface({ input: stream, crlfDelay: Infinity });
    let customTitle = '';
    let fallback = '';

    const close = (value: string) => {
      resolve(value);
      reader.close();
      stream.destroy();
    };

    reader.on('line', (line) => {
      if (!line.trim()) return;

      const entry = parseLine(line);
      if (!entry) return;

      if (entry.type === 'custom-title' && 'customTitle' in entry) {
        customTitle = normalizeText(
          String((entry as { customTitle: string }).customTitle)
        );

        return;
      }

      if (entry.type === 'session_title' && 'title' in entry) {
        if (!fallback) {
          fallback = normalizeText(String((entry as { title: string }).title));
        }

        return;
      }

      if (fallback) return;
      if (entry.type !== 'user') return;

      const texts = entry.message?.content ?? [];

      for (const block of texts) {
        if (block.type !== 'text' || !block.text) continue;

        const text = normalizeText(block.text);
        if (text.startsWith('<')) continue;
        if (text.length <= MIN_TEXT_LENGTH) continue;

        fallback = text;
        return;
      }
    });

    reader.on('close', () => resolve(customTitle || fallback));
    stream.on('error', () => close(''));
  });
