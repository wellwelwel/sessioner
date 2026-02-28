# Project Conventions

Implementation patterns, long-term maintenance best practices, negative rules and impact map.

## Priorities (in order)

1. **Security** — never compromise
2. **Maintainability** — clean names, decoupling, good file and logic organization
3. **Performance** — never compromising long-term maintenance

## Conventions

- Early return always; avoid `if-else` — exit early, allocate variables only after guards
- Reusable functions must be decoupled into their own modules
- type instead of interface
- Arrow functions — function only when this is necessary
- const whenever possible — let when reassignment is unavoidable; never var
- Map/Set for collections; conventional arrays when Map/Set is not viable
- Clear variable names, no abbreviations, preferably one or two words
  - Above two words, consider whether an object fits better
  - Includes callback parameters: `(entry)` instead of `(e)`, `(block)` instead of `(b)`
- Named constants for numeric values — no inline magic numbers
- No `any` — custom types defined in src/types.ts (Message, ContentBlock, etc.)
- Safe indexed access — guards with undefined checks, never `!` assertions
- ESM imports (import/export)
- No top-level await, except in src/bin/
- UI dependencies: @clack/prompts, @clack/core
- Runner: tsx

## Negative rules

What the implementation deliberately avoids:

| Rule                                      | Evidence                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| **Avoid if-else**                         | Early return always; exit early, allocate after guards                          |
| **No coupled logic**                      | Reusable functions extracted into src/helpers/                                  |
| **No classes**                            | 100% functional architecture with exported pure functions                       |
| **No var**                                | const preferred; let only when reassignment is unavoidable                      |
| **No interface**                          | type only; consistency in the type system                                       |
| **No function declarations**              | Arrow functions assigned to const only                                          |
| **No default exports**                    | All exports are named; explicit imports                                         |
| **No top-level await**                    | Async encapsulated in functions; main invoked explicitly                        |
| **No color libraries**                    | Direct ANSI codes; zero extra deps                                              |
| **No date libraries**                     | Native Date; manual formatting                                                  |
| **No .then()/callbacks**                  | async/await; new Promise only for stream wrapping                               |
| **No error logging**                      | Silent failures with default values                                             |
| **No global/mutable state**               | No singletons, no modules with side effects (except src/bin/)                   |
| **No tests**                              | Verification via npm start                                                      |
| **No build step**                         | tsx runs TS directly; dist/ configured but unused                               |
| **No env vars / config files**            | Paths come via argv (--project, --base)                                         |
| **No circular re-exports**                | Modules import directly from origin; no barrel                                  |
| **No abbreviations in names**             | Descriptive full names; includes callback parameters                            |
| **No magic numbers**                      | Numeric values extracted as named constants at the top of the module            |
| **No `any`**                              | Custom types from src/types.ts; Message, ContentBlock, etc.                     |
| **No non-null assertions on indices**     | Guards with undefined checks; respect noUncheckedIndexedAccess                  |
| **No runtime dependencies beyond @clack** | Minimalism; @clack/prompts + @clack/core; everything else via Node.js built-ins |

## Impact map

### Critical — breaks the entire tool

| What                | Where                         | Why                                                  |
| ------------------- | ----------------------------- | ---------------------------------------------------- |
| Main event loop     | src/bin/index.ts              | Single execution point; any error here kills the CLI |
| Domain types        | src/types.ts                  | All project types — every module depends on them     |
| listSessions        | src/sessions/list-sessions.ts | Orchestrates discovery; without it, no data          |
| select/selectAction | src/ui/select.ts              | Main user interface; without it, no interaction      |

### High — breaks a complete feature

| What               | Where                            | Why                                                            |
| ------------------ | -------------------------------- | -------------------------------------------------------------- |
| File discovery     | src/sessions/                    | Without discovery, listSessions returns empty                  |
| Message extraction | src/sessions/                    | Without extraction, sessions have no name                      |
| JSONL parsing      | src/sessions/                    | Used by extraction, preview, stats and analysis                |
| JSONL rewrite      | src/sessions/rewrite-jsonl.ts    | UUID remapping used by fork and merge                          |
| Prune analysis     | src/sessions/analyze-prune.ts    | Counts tool blocks, tags, prunable messages                    |
| Trim extraction    | src/sessions/extract-messages.ts | Extracts messages with ordinal for selection                   |
| Session fork       | src/actions/fork.ts              | Copies JSONL + subagents with remapped UUIDs                   |
| Session merge      | src/actions/merge.ts             | Concatenates multiple sessions into a new one                  |
| Session prune      | src/actions/prune.ts             | Removes tool blocks, tags, short/empty messages and old titles |
| Session trim       | src/actions/trim.ts              | Cuts messages from a given point                               |
| Session delete     | src/actions/delete.ts            | Removes file, subagents and index                              |
| Session rename     | src/actions/rename.ts            | Writes custom-title entry to session file                      |
| Session stats      | src/sessions/stats.ts            | Calculates duration, tokens, costs and tool usage              |
| Session search     | src/sessions/search-sessions.ts  | Streams all sessions in parallel for text matching             |

### Medium — degrades visual experience/UX

| What               | Where                           | Why                                                   |
| ------------------ | ------------------------------- | ----------------------------------------------------- |
| Formatting helpers | src/helpers/                    | Without them, menus lose formatting and layout breaks |
| Format stats       | src/helpers/format-stats.ts     | Formats tokens, costs and tools for display           |
| Session preview    | src/actions/preview.ts          | Secondary feature                                     |
| Session open       | src/actions/open.ts             | Opens file in native explorer (cross-platform)        |
| Subagent count     | src/sessions/count-subagents.ts | Displayed in the session header                       |
| UI layout          | src/ui/layout.ts                | Shared constants, header and shortcuts across UI      |
| Multi-select       | src/ui/select.ts                | Multiple session selection for merge                  |
| Prune options      | src/ui/select.ts                | Option selection for session prune                    |
| Trim line select   | src/ui/select.ts                | Message selection for trim cut point                  |
| Search results     | src/ui/search.ts                | Paginated grouped search results display              |
| Clean empty        | src/actions/delete.ts           | Batch-cleans empty sessions                           |
