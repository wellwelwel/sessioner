import type { SelectOption } from '../types.js';
import { dim } from '../helpers/ansi.js';
import { getColumns } from '../helpers/get-columns.js';
import { truncate } from '../helpers/truncate.js';

export const PAGE_SIZE = 10;
export const NEXT = -1;
export const PREVIOUS = -2;
export const EXIT = -3;
export const CONFIRM = -4;
export const CANCEL = -5;

export const HEADER_MARGIN = 13; // terminal right-side safety margin
export const CLACK_PREFIX = 6; // @clack/prompts left gutter width
export const CHECKBOX_WIDTH = 2; // "☑ " / "☐ " prefix
export const EXIT_NUMBER = 0;
export const CANCEL_NUMBER = 0;

export const buildShortcuts = <T>(
  options: SelectOption<T>[]
): Map<string, number> => {
  const shortcuts = new Map<string, number>();

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (!option || option.number === undefined) continue;
    shortcuts.set(String(option.number), index);
  }

  return shortcuts;
};

export const clear = () => {
  process.stdout.write('\x1b[2J\x1b[H');
};

export const printHeader = (fields: Record<string, string>) => {
  clear();
  const columns = getColumns();
  const longest = Math.max(...Object.keys(fields).map((key) => key.length));

  console.log();

  for (const [key, value] of Object.entries(fields)) {
    const padding = ' '.repeat(longest - key.length + 2);
    const prefixLength = 2 + key.length + 1 + padding.length;
    const available = columns - prefixLength - HEADER_MARGIN;
    const truncated = available > 0 ? truncate(value, available) : value;

    console.log(`  ${dim(`${key}:`)}${padding}${truncated}`);
  }

  console.log();
};

export const showHeader = (fields?: Record<string, string>) => {
  if (!fields) return clear();
  printHeader(fields);
};
