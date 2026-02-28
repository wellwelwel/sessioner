# Sessioner

Interactive CLI tool to navigate and select Claude Code session contexts. 100% functional architecture (no classes), with arrow functions, ESM imports, and minimal dependencies (@clack/prompts + @clack/core). Direct execution via tsx, no build step.

## Priorities (in order)

1. **Security** — never compromise
2. **Maintainability** — clean names, decoupling, good file and logic organization
3. **Performance** — never compromising long-term maintenance

## Quick reference

- Early return always; `type` (never `interface`); `const` (never `var`); arrow functions
- Types centralized in src/types.ts — no `any`, no `!` assertions
- Import direction: `bin/ → actions/ → sessions/ → helpers/` (never the reverse)

## Skills

| Skill        | Command         | Content                                                                                             |
| ------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| Conventions  | `/conventions`  | Implementation rules and patterns, long-term maintenance best practices, negative rules, impact map |
| Architecture | `/architecture` | Directory structure, decoupling, data flow and I/O                                                  |
| Types        | `/typings`      | Type system, obligations and restrictions                                                           |

## Verification

```sh
npm start
npm start -- --project /path/to/project
npm start -- --project /path/to/project --base /other/.claude/projects
```

- Navigable list with up/down arrows
- Enter confirms and opens action menu (open, stats, fork, merge, prune, trim, rename, delete)
- Search finds text across all sessions with highlighted results
- Ctrl+C exits without error
- Invalid arguments display usage message

## Auto update

When modifying code that impacts documentation, update in the same change:

1. **Skills** — if the change affects conventions, architecture, types or impact map, update the corresponding skill in `.claude/commands/`
2. **CLAUDE.md** — if the change affects priorities, quick reference, skills table or verification, update this file
3. **README.md** — if the change affects features, actions, navigation, CLI options or development instructions, update the README

Trigger examples:

- New action in `src/actions/` → update `/conventions` (impact map), `/architecture` (data flow) and README (Actions section)
- New type in `src/types.ts` → update `/typings` (catalog)
- New helper in `src/helpers/` → update `/architecture` (structure) and `/conventions` (impact map) if relevant
- Convention change → update `/conventions` and quick reference in this file
- New npm script → update README (Development section)
