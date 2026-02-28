import type { SearchMatch, SelectOption, Session } from '../types.js';
import { isCancel, text } from '@clack/prompts';
import { bold, colorize } from '../helpers/ansi.js';
import { getColumns } from '../helpers/get-columns.js';
import { truncate } from '../helpers/truncate.js';
import { select as customSelect } from './custom-select.js';
import {
  buildShortcuts,
  CANCEL,
  CLACK_PREFIX,
  clear,
  EXIT,
  EXIT_NUMBER,
  HEADER_MARGIN,
  NEXT,
  PAGE_SIZE,
  PREVIOUS,
  showHeader,
} from './layout.js';

const MATCH_COLOR = '38;5;208';
const SESSION_ICON = '◌';
const TITLE_MAX_LENGTH = 100;
const INDENT = '  ';
const INDENT_WIDTH = 2;

export const promptSearch = async (
  fields?: Record<string, string>
): Promise<string | null> => {
  showHeader(fields);

  const result = await text({
    message: 'Search query (Esc to cancel)',
    placeholder: 'Type to search across all sessions...',
  });

  if (isCancel(result)) return null;

  const trimmed = result.trim();
  if (!trimmed) return null;

  return trimmed;
};

export const showNoResults = async (
  query: string,
  fields?: Record<string, string>
): Promise<void> => {
  showHeader(fields);

  await customSelect({
    message: `No results for "${query}"`,
    options: [
      { label: '', value: 'back', disabled: true, separator: true },
      { label: 'Back', value: 'back', icon: '←' },
    ],
    numbered: true,
  });
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatch = (value: string, query: string): string => {
  const pattern = new RegExp(escapeRegExp(query), 'gi');
  return value.replace(pattern, (match) => colorize(match, MATCH_COLOR));
};

const flattenMatches = (
  results: SearchMatch[]
): { session: Session; text: string }[] =>
  results.flatMap((result) =>
    result.entries.map((text) => ({ session: result.session, text }))
  );

export const selectSearchResult = async (
  results: SearchMatch[],
  query: string,
  fields?: Record<string, string>
): Promise<Session | 'exit' | null> => {
  const entries = flattenMatches(results);
  let page = 0;
  const total = Math.ceil(entries.length / PAGE_SIZE);

  const matchCounts = new Map<string, number>();
  for (const result of results) {
    matchCounts.set(result.session.id, result.entries.length);
  }

  pages: while (true) {
    showHeader(fields);
    const start = page * PAGE_SIZE;
    const slice = entries.slice(start, start + PAGE_SIZE);
    const columns = getColumns();
    const labelMax = columns - CLACK_PREFIX - HEADER_MARGIN;

    const options: SelectOption<number>[] = [];
    let lastSessionId = '';

    for (let index = 0; index < slice.length; index++) {
      const entry = slice[index];
      if (!entry) continue;

      if (entry.session.id !== lastSessionId) {
        if (options.length > 0) {
          options.push({
            label: '',
            value: EXIT,
            disabled: true,
            separator: true,
          });
        }

        lastSessionId = entry.session.id;

        const count = matchCounts.get(entry.session.id) ?? 0;
        const suffix = count === 1 ? 'match' : 'matches';

        options.push({
          label: bold(truncate(entry.session.message, TITLE_MAX_LENGTH)),
          value: EXIT,
          disabled: true,
          icon: colorize(SESSION_ICON, MATCH_COLOR),
          hint: `${count} ${suffix} · ${entry.session.date}`,
        });
      }

      const truncated = truncate(entry.text, labelMax - INDENT_WIDTH);
      const highlighted = highlightMatch(truncated, query);

      options.push({
        label: `${INDENT}${highlighted}`,
        value: start + index,
      });
    }

    options.push({ label: '', value: EXIT, disabled: true, separator: true });

    let actionNumber = 1;

    if (page > 0) {
      options.push({
        label: 'Previous',
        value: PREVIOUS,
        icon: '←',
        number: actionNumber,
      });
      actionNumber++;
    }

    if (page < total - 1) {
      options.push({
        label: 'Next',
        value: NEXT,
        icon: '→',
        number: actionNumber,
      });
      actionNumber++;
    }

    options.push({ label: '', value: EXIT, disabled: true, separator: true });

    options.push({
      label: 'Back to menu',
      value: EXIT,
      icon: '☰',
      number: actionNumber,
    });

    options.push({
      label: 'Exit',
      value: CANCEL,
      icon: '✕',
      iconColor: '38;5;204',
      number: EXIT_NUMBER,
    });

    const result = await customSelect({
      message: `Search results (${page + 1}/${total})`,
      options,
      shortcuts: buildShortcuts(options),
    });

    if (isCancel(result) || result === undefined) return null;

    if (result === EXIT) return null;

    if (result === CANCEL) return 'exit';

    if (result === NEXT) {
      page++;
      clear();
      continue pages;
    }

    if (result === PREVIOUS) {
      page--;
      clear();
      continue pages;
    }

    const selected = entries[result];
    if (!selected) continue pages;

    return selected.session;
  }
};
