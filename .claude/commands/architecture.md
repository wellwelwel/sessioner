# Project Architecture

## Structure

```
src/
├── types.ts                              # All project types (centralized)
├── bin/                                  # CLI entrypoint (main loop, parseArgs)
├── helpers/                              # Generic utilities (formatting, terminal, text, ANSI)
├── sessions/                             # Domain: JSONL parsing, discovery, read-only analysis, stats, search
├── ui/                                   # Interactive menus with @clack/prompts
└── actions/                              # Mutations on sessions (open, fork, merge, prune, trim, rename, delete, preview)
```

## Decoupling

### Directory level — each folder has a single responsibility

| Directory   | Responsibility                      | Decisive criterion                                                     |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `bin/`      | Entrypoint and orchestration        | Only place with top-level await and CLI flow control                   |
| `sessions/` | Domain: reading, parsing & analysis | Reads JSONL, extracts data, computes metrics — **never writes**        |
| `actions/`  | Mutations on sessions               | Writes, copies, deletes, renames files — **always mutates state**      |
| `helpers/`  | Generic utilities without domain    | Formatting, ANSI, terminal, truncation — **no imports from sessions/** |
| `ui/`       | Interactive menus with @clack       | Receives ready data, displays, returns selection — **no disk I/O**     |

### File level — each file contains only functions within its responsibility

- The file name defines the scope: `trim.ts` exports `trim`, not `extractMessages`
- Internal helper functions are private (no export) and belong to the file that uses them
- Functions shared between two or more files are extracted into their own module
- If a function is read-only (does not mutate state), it belongs in `sessions/`, not `actions/`
- If a function is a pure data transformation without domain knowledge, it belongs in `helpers/`

### Import direction — unidirectional dependency

```
bin/ ──→ actions/, sessions/, helpers/, ui/
actions/ ──→ sessions/, helpers/
sessions/ ──→ helpers/  (or among themselves)
ui/ ──→ helpers/
helpers/ ──→ (no internal dependencies)
```

- `actions/` can import from `sessions/` (e.g.: `prune.ts` imports helpers from `analyze-prune.ts`)
- `sessions/` never imports from `actions/`
- `helpers/` never imports from `sessions/`, `actions/` or `ui/`
- `ui/` never imports from `actions/` or `sessions/`
- Circular dependencies between directories are forbidden

### Belonging test — where to place a new function

1. Does the function write, delete or modify files? → `actions/`
2. Does the function read JSONL, extract data or compute metrics without mutating? → `sessions/`
3. Does the function format text, manipulate strings or deal with the terminal? → `helpers/`
4. Does the function display an interactive menu or collect input? → `ui/`
5. Is the function shared by two modules from different layers? → own module in the lowest layer

## Data flow

```
src/bin/ (main loop — parseArgs: --project, --base)
  │
  ├─→ src/sessions/ (discovery + parsing + read-only analysis)
  │     ├─→ discovers .jsonl files
  │     ├─→ extracts title/first message from each file
  │     ├─→ counts subagents per session
  │     ├─→ calculates stats (tokens, costs, tools, duration)
  │     ├─→ analyzes content for prune (tool block count, tags, etc.)
  │     ├─→ extracts messages for trim (message list with ordinal)
  │     ├─→ searches text content across all sessions (parallel streaming)
  │     ├─→ rewrites JSONL with remapped UUIDs (used by fork and merge)
  │     └─→ returns session list sorted by date + empty files
  │
  ├─→ src/ui/ (interactive selection → chosen Session)
  │     └─→ selectMultiple → checkbox selection for merge
  │
  ├─→ src/actions/preview (inline preview before the action menu)
  │
  └─→ src/actions/ (mutations on the chosen session)
        ├─→ open → opens in native explorer (cross-platform)
        ├─→ fork → copies JSONL + subagents with remapped UUIDs
        ├─→ merge → concatenates multiple sessions into a new one
        ├─→ prune → removes tool blocks, tags and short/empty messages
        ├─→ trim → cuts messages from a given point
        ├─→ rename → writes custom-title entry to session file
        ├─→ delete → removes file, subagents and index
        ├─→ clean → batch-cleans empty sessions
        ├─→ back → returns to select
        └─→ exit → exits
```

## Loops

- **Menu loop**: main menu (Sessions, Search, Stats, Clean, Exit)
- **Session list loop**: session selection (returns after action or back)
- **Search loop**: search results (returns after action, re-queries on back)
- **Action handler**: `handleSession` — action selection per session (extracted function, returns `ActionResult`)
- break menu exits; continue menu returns to the main menu

## Pagination (UI)

- Page of 10 items
- Numeric sentinels for navigation (next, previous, exit, confirm, cancel, clean)
- Disabled options as visual separators
- Icons: ← (back), → (next), ✕ (exit), ✓ (confirm), ☰ (menu)
- Multi-select with checkbox (☑/☐) for session merge

## I/O

- Reading via streams — extraction and preview use createReadStream + readline
- Reading via fs/promises — fork, merge, delete, prune, trim, stats use readFile/writeFile
- Writing via fs/promises — rename (appendFile), fork (cp), merge (writeFile), delete (rm/unlink), prune (writeFile), trim (writeFile)

## Async

- UI operations are async (@clack/prompts)
- File I/O is async via fs/promises
- Streams in extraction and preview (createReadStream + readline, wrapped in new Promise)
- No promise chaining — consistent async/await; new Promise only for streams

## Errors

- Silent try/catch with sensible fallback (null, empty Map, empty string)
- No error logging — silent degradation
