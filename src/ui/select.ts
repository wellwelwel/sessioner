import type { Action, PruneStats, SelectOption, Session } from '../types.js';
import { isCancel, text } from '@clack/prompts';
import { getColumns } from '../helpers/get-columns.js';
import { truncate } from '../helpers/truncate.js';
import { select as customSelect } from './custom-select.js';
import {
  buildShortcuts,
  CANCEL,
  CANCEL_NUMBER,
  CHECKBOX_WIDTH,
  CLACK_PREFIX,
  clear,
  CONFIRM,
  EXIT,
  EXIT_NUMBER,
  HEADER_MARGIN,
  NEXT,
  PAGE_SIZE,
  PREVIOUS,
  printHeader,
  showHeader,
} from './layout.js';

export const selectMain = async (
  project: string,
  base: string,
  emptyCount = 0
): Promise<'sessions' | 'search' | 'stats' | 'clean' | null> => {
  printHeader({ Project: project, Base: base });

  const options: SelectOption<string>[] = [
    { label: 'Sessions', value: 'sessions' },
    { label: 'Search', value: 'search' },
    { label: 'Stats', value: 'stats' },
  ];

  if (emptyCount > 0) {
    options.push({
      label: `Clean ${emptyCount} empty sessions`,
      value: 'clean',
    });
  }

  options.push({ label: '', value: 'exit', disabled: true, separator: true });
  options.push({
    label: 'Exit',
    value: 'exit',
    icon: '✕',
    iconColor: '38;5;204',
  });

  const result = await customSelect({
    message: 'Select an option',
    options,
    numbered: true,
  });

  if (isCancel(result) || result === undefined) return null;
  if (result === 'exit') return null;

  return result as 'sessions' | 'search' | 'stats' | 'clean';
};

export const select = async (
  sessions: Session[],
  project: string,
  base: string
): Promise<Session | 'exit' | null> => {
  let page = 0;

  const total = Math.ceil(sessions.length / PAGE_SIZE);

  pages: while (true) {
    printHeader({ Project: project, Base: base });
    const start = page * PAGE_SIZE;
    const slice = sessions.slice(start, start + PAGE_SIZE);
    const columns = getColumns();
    const labelMax = columns - CLACK_PREFIX - HEADER_MARGIN;
    const options: SelectOption<number>[] = slice.map((session, index) => ({
      label: truncate(session.message, labelMax),
      value: start + index,
    }));

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
      message: `Select a session (${page + 1}/${total})`,
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

    return sessions[result] ?? null;
  }
};

export const selectAction = async (
  session: Session,
  project: string,
  base: string,
  previewLines: string[],
  subagentCount: number
): Promise<Action | null> => {
  const fields: Record<string, string> = {
    Project: project,
    Base: base,
    ID: session.id,
    Date: session.date,
    Title: session.message,
  };

  if (subagentCount > 0) fields.Subagents = String(subagentCount);

  printHeader(fields);

  for (const line of previewLines) console.log(line);
  if (previewLines.length > 0) console.log();

  const options: SelectOption<Action>[] = [
    { label: 'Open', value: 'open' },
    { label: 'Stats', value: 'stats' },
    { label: 'Fork', value: 'fork' },
    { label: 'Merge', value: 'merge' },
    { label: 'Prune', value: 'prune' },
    { label: 'Trim', value: 'trim' },
    { label: 'Rename', value: 'rename' },
    { label: 'Delete', value: 'delete' },
    { label: '', value: 'back', disabled: true, separator: true },
    { label: 'Back', value: 'back', icon: '←' },
    { label: 'Exit', value: 'exit', icon: '✕', iconColor: '38;5;204' },
  ];

  const result = await customSelect({
    message: 'Choose an action',
    options,
    numbered: true,
  });

  if (isCancel(result) || result === undefined) return null;

  return result;
};

export const selectMultiple = async (
  sessions: Session[],
  project: string,
  base: string
): Promise<Session[] | null> => {
  const selected = new Set<number>();
  let page = 0;

  const total = Math.ceil(sessions.length / PAGE_SIZE);

  picks: while (true) {
    printHeader({ Project: project, Base: base });
    const start = page * PAGE_SIZE;
    const slice = sessions.slice(start, start + PAGE_SIZE);
    const columns = getColumns();
    const labelMax = columns - CLACK_PREFIX - HEADER_MARGIN - CHECKBOX_WIDTH;

    const options: SelectOption<number>[] = slice.map((session, index) => {
      const absolute = start + index;
      const checkbox = selected.has(absolute) ? '☑' : '☐';
      return {
        label: `${checkbox} ${truncate(session.message, labelMax)}`,
        value: absolute,
      };
    });

    options.push({ label: '', value: CANCEL, disabled: true, separator: true });

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

    options.push({
      label: `Confirm (${selected.size})`,
      value: CONFIRM,
      icon: '✓',
      number: actionNumber,
    });

    options.push({
      label: 'Cancel',
      value: CANCEL,
      icon: '✕',
      iconColor: '38;5;204',
      number: CANCEL_NUMBER,
    });

    const result = await customSelect({
      message: `Select sessions to merge (${page + 1}/${total})`,
      options,
      shortcuts: buildShortcuts(options),
    });

    if (isCancel(result) || result === undefined) return null;

    if (result === CANCEL) return null;

    if (result === NEXT) {
      page++;
      clear();
      continue picks;
    }

    if (result === PREVIOUS) {
      page--;
      clear();
      continue picks;
    }

    if (result === CONFIRM) {
      if (selected.size === 0) continue picks;
      return [...selected]
        .map((index) => sessions[index])
        .filter((session): session is Session => session !== undefined);
    }

    if (selected.has(result)) {
      selected.delete(result);
    } else {
      selected.add(result);
    }

    clear();
  }
};

export const promptTitle = async (
  fields?: Record<string, string>
): Promise<string | null> => {
  showHeader(fields);

  const result = await text({
    message: 'New title (Esc to cancel)',
    placeholder: 'Type the new session title...',
  });

  if (isCancel(result)) return null;

  return result;
};

export const promptConfirm = async (
  message: string
): Promise<boolean | null> => {
  const result = await customSelect({
    message,
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    numbered: true,
  });

  if (isCancel(result) || result === undefined) return null;

  return result;
};

export const selectPruneOptions = async (
  stats: PruneStats,
  fields?: Record<string, string>
): Promise<Set<keyof PruneStats> | 'exit' | null> => {
  const entries: {
    key: keyof PruneStats;
    label: string;
    defaultSelected: boolean;
  }[] = [];

  if (stats.toolBlocks > 0)
    entries.push({
      key: 'toolBlocks',
      label: `${stats.toolBlocks} tool blocks`,
      defaultSelected: true,
    });

  if (stats.emptyMessages > 0)
    entries.push({
      key: 'emptyMessages',
      label: `${stats.emptyMessages} empty messages`,
      defaultSelected: true,
    });

  if (stats.systemTags > 0)
    entries.push({
      key: 'systemTags',
      label: `${stats.systemTags} system/IDE tags`,
      defaultSelected: true,
    });

  if (stats.customTitles > 0)
    entries.push({
      key: 'customTitles',
      label: `${stats.customTitles} old custom titles`,
      defaultSelected: true,
    });

  if (stats.shortMessages > 0)
    entries.push({
      key: 'shortMessages',
      label: `${stats.shortMessages} short messages (<50 chars)`,
      defaultSelected: false,
    });

  if (entries.length === 0) {
    showHeader(fields);

    const result = await customSelect({
      message: 'Nothing to prune',
      options: [
        { label: '', value: 'back', disabled: true, separator: true },
        { label: 'Back', value: 'back', icon: '←' },
        { label: 'Exit', value: 'exit', icon: '✕', iconColor: '38;5;204' },
      ],
      numbered: true,
    });

    if (result === 'exit') return 'exit';

    return null;
  }

  const selected = new Set<number>();
  let cursor: number | undefined;

  for (let index = 0; index < entries.length; index++) {
    if (entries[index]?.defaultSelected) selected.add(index);
  }

  toggle: while (true) {
    showHeader(fields);

    const options: SelectOption<number>[] = entries.map((entry, index) => {
      const checkbox = selected.has(index) ? '☑' : '☐';
      return { label: `${checkbox} ${entry.label}`, value: index };
    });

    options.push({ label: '', value: CANCEL, disabled: true, separator: true });

    options.push({
      label: `Confirm (${selected.size})`,
      value: CONFIRM,
      icon: '✓',
      number: 1,
    });

    options.push({
      label: 'Cancel',
      value: CANCEL,
      icon: '✕',
      iconColor: '38;5;204',
      number: CANCEL_NUMBER,
    });

    const result = await customSelect({
      message: 'Select what to prune',
      options,
      initialValue: cursor,
      shortcuts: buildShortcuts(options),
    });

    if (isCancel(result) || result === undefined) return null;

    if (result === CANCEL) return null;

    if (result === CONFIRM) {
      if (selected.size === 0) continue toggle;
      return new Set(
        [...selected]
          .map((index) => entries[index]?.key)
          .filter((key): key is keyof PruneStats => key !== undefined)
      );
    }

    if (selected.has(result)) {
      selected.delete(result);
    } else {
      selected.add(result);
    }

    cursor = result;
  }
};

export const selectTrimLine = async (
  messages: [number, string][],
  fields?: Record<string, string>
): Promise<number | null> => {
  let page = 0;

  const total = Math.ceil(messages.length / PAGE_SIZE);

  pages: while (true) {
    showHeader(fields);

    const start = page * PAGE_SIZE;
    const slice = messages.slice(start, start + PAGE_SIZE);
    const columns = getColumns();
    const labelMax = columns - CLACK_PREFIX - HEADER_MARGIN;

    const options: SelectOption<number>[] = slice.map(([ordinal, label]) => ({
      label: truncate(label, labelMax),
      value: ordinal,
    }));

    options.push({ label: '', value: CANCEL, disabled: true, separator: true });

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

    options.push({
      label: 'Cancel',
      value: CANCEL,
      icon: '✕',
      iconColor: '38;5;204',
      number: CANCEL_NUMBER,
    });

    const result = await customSelect({
      message: `Select last message to keep (${page + 1}/${total})`,
      options,
      shortcuts: buildShortcuts(options),
    });

    if (isCancel(result) || result === undefined) return null;

    if (result === CANCEL) return null;

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

    return result;
  }
};

export const showProjectStats = async (
  lines: string[],
  fields: Record<string, string>
): Promise<void> => {
  printHeader(fields);

  for (const line of lines) console.log(line);
  if (lines.length > 0) console.log();

  await customSelect({
    message: 'Stats',
    options: [
      { label: '', value: 'back', disabled: true, separator: true },
      { label: 'Back', value: 'back', icon: '←' },
    ],
    numbered: true,
  });
};
