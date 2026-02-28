#!/usr/bin/env node
import type { ActionResult, Session } from '../types.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { cleanEmpty, remove, targets } from '../actions/delete.js';
import { fork } from '../actions/fork.js';
import { merge } from '../actions/merge.js';
import { open } from '../actions/open.js';
import { preview } from '../actions/preview.js';
import { prune } from '../actions/prune.js';
import { rename } from '../actions/rename.js';
import { trim } from '../actions/trim.js';
import { formatProjectStats, formatStats } from '../helpers/format-stats.js';
import { analyze } from '../sessions/analyze-prune.js';
import { countSubagents } from '../sessions/count-subagents.js';
import { extractMessages } from '../sessions/extract-messages.js';
import { listSessions } from '../sessions/list-sessions.js';
import { searchSessions } from '../sessions/search-sessions.js';
import { projectStats, stats } from '../sessions/stats.js';
import {
  promptSearch,
  selectSearchResult,
  showNoResults,
} from '../ui/search.js';
import {
  promptConfirm,
  promptTitle,
  select,
  selectAction,
  selectMain,
  selectMultiple,
  selectPruneOptions,
  selectTrimLine,
  showProjectStats,
} from '../ui/select.js';

const usage = [
  'Usage: sessioner [options]',
  '',
  'Options:',
  '  -p, --project <path>  Project path (default: cwd)',
  '  -b, --base <path>     Agent base directory (default: ~/.claude/projects)',
].join('\n');

let values: { project?: string; base?: string };

try {
  ({ values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      base: { type: 'string', short: 'b' },
      project: { type: 'string', short: 'p' },
    },
  }));
} catch {
  console.error(usage);
  process.exit(1);
}

const CTRL_C = 0x03;

if (process.stdin.isTTY) {
  process.stdin.prependListener('data', (data: Buffer) => {
    if (data[0] === CTRL_C) {
      process.stdin.setRawMode(false);
      process.stdout.write('\x1b[?25h\n');
      process.exit(0);
    }
  });
}

const project = values.project ?? process.cwd();
const base = values.base ?? join(homedir(), '.claude', 'projects');

const handleSession = async (
  initial: Session,
  allSessions: Session[],
  project: string,
  base: string
): Promise<ActionResult> => {
  let session = initial;
  let previewLines = await preview(session);
  let subagentCount = await countSubagents(session);

  action: while (true) {
    const action = await selectAction(
      session,
      project,
      base,
      previewLines,
      subagentCount
    );
    if (!action) return 'back';

    switch (action) {
      case 'back':
        return 'back';

      case 'rename': {
        const title = await promptTitle({
          Project: project,
          Base: base,
          ID: session.id,
          Date: session.date,
          Title: session.message,
        });
        if (!title) continue action;

        await rename(session, title);
        session.message = title;
        continue action;
      }

      case 'open':
        open(session);
        continue action;

      case 'stats': {
        const sessionStats = await stats(session);
        previewLines = formatStats(sessionStats);
        continue action;
      }

      case 'fork': {
        const defaultTitle = `Fork: ${session.message}`;
        const forked = await fork(session, defaultTitle);
        await rename(forked, defaultTitle);

        const title = await promptTitle({
          Project: project,
          Base: base,
          ID: forked.id,
          Date: forked.date,
          Title: forked.message,
        });

        if (title) {
          await rename(forked, title);
          forked.message = title;
        }

        session = forked;
        previewLines = await preview(session);
        subagentCount = await countSubagents(session);

        continue action;
      }

      case 'merge': {
        const current = session;
        const others = await selectMultiple(
          allSessions.filter((session) => session.id !== current.id),
          project,
          base
        );
        if (!others || others.length === 0) continue action;

        const all = [current, ...others];
        const titles = all.map((session) => session.message);
        const defaultTitle = `Merge: ${titles.join(', ')}`;
        const merged = await merge(all, defaultTitle);
        await rename(merged, defaultTitle);

        const title = await promptTitle({
          Project: project,
          Base: base,
          ID: merged.id,
          Date: merged.date,
          Title: merged.message,
        });

        if (title) {
          await rename(merged, title);
          merged.message = title;
        }

        session = merged;
        previewLines = await preview(session);
        subagentCount = await countSubagents(session);

        continue action;
      }

      case 'prune': {
        const pruneStats = await analyze(session);
        const selected = await selectPruneOptions(pruneStats, {
          Project: project,
          Base: base,
          ID: session.id,
          Date: session.date,
          Title: session.message,
        });

        if (selected === 'exit') return 'exit';
        if (!selected) continue action;

        await prune(session, {
          toolBlocks: selected.has('toolBlocks'),
          shortMessages: selected.has('shortMessages'),
          emptyMessages: selected.has('emptyMessages'),
          systemTags: selected.has('systemTags'),
          customTitles: selected.has('customTitles'),
        });

        previewLines = await preview(session);
        subagentCount = await countSubagents(session);

        continue action;
      }

      case 'trim': {
        const { total, lines } = await extractMessages(session);

        if (lines.length <= 1) continue action;

        const selected = await selectTrimLine(lines, {
          Project: project,
          Base: base,
          ID: session.id,
          Date: session.date,
          Title: session.message,
        });

        if (selected === null) continue action;

        const keepCount = selected + 1;
        const removeCount = total - keepCount;

        if (removeCount <= 0) continue action;

        const confirmed = await promptConfirm(
          `Remove last ${removeCount} of ${total} messages?`
        );
        if (!confirmed) continue action;

        await trim(session, keepCount);
        previewLines = await preview(session);
        subagentCount = await countSubagents(session);

        continue action;
      }

      case 'delete': {
        const items = await targets(session);
        const confirmed = await promptConfirm(`Delete ${items.join(' + ')}?`);
        if (!confirmed) continue action;

        await remove(session);
        return 'back';
      }

      case 'exit':
        return 'exit';
    }
  }
};

menu: while (true) {
  const { sessions, empty } = await listSessions(project, base);
  const choice = await selectMain(project, base, empty.length);
  if (!choice) break;

  if (choice === 'stats') {
    const aggregated = await projectStats(sessions);
    const lines = formatProjectStats(aggregated, sessions.length);
    await showProjectStats(lines, { Project: project, Base: base });
    continue menu;
  }

  if (choice === 'clean') {
    const confirmed = await promptConfirm(
      `Delete ${empty.length} empty sessions?`
    );
    if (!confirmed) continue menu;

    await cleanEmpty(empty);
    continue menu;
  }

  if (choice === 'search') {
    const fields = { Project: project, Base: base };
    const query = await promptSearch(fields);
    if (!query) continue menu;

    search: while (true) {
      const { sessions: current } = await listSessions(project, base);
      const results = await searchSessions(current, query);

      if (results.length === 0) {
        await showNoResults(query, fields);
        continue menu;
      }

      const selected = await selectSearchResult(results, query, fields);

      if (!selected) continue menu;
      if (selected === 'exit') break menu;

      const { sessions: fresh } = await listSessions(project, base);
      const actionResult = await handleSession(selected, fresh, project, base);

      if (actionResult === 'exit') break menu;

      continue search;
    }
  }

  list: while (true) {
    const { sessions: fresh } = await listSessions(project, base);

    const result = await select(fresh, project, base);
    if (!result) continue menu;

    if (result === 'exit') break menu;

    const actionResult = await handleSession(result, fresh, project, base);

    if (actionResult === 'exit') break menu;

    continue list;
  }
}
