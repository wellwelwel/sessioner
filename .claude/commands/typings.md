# Types

## Location

All types centralized in src/types.ts — no type defined outside this file.

## Catalog

- Domain: MessageContent, Message, Session, Action
- UI: SelectOption, SelectConfig, StyledLabelOptions
- Sessions: ListResult
- Index: IndexEntry, SessionIndex
- Analysis: ContentBlock
- Stats: ModelName, TokenUsage, SessionStats
- Prune: PruneStats, PruneOptions
- Search: SearchMatch
- Orchestration: ActionResult

## Obligations

- Use `type` always — never `interface`
- Custom types for everything — no `any` under any circumstance
- Safe indexed access — guards with undefined checks before using array/object values
- Respect `noUncheckedIndexedAccess` from tsconfig — treat every indexed access as `T | undefined`
- New types must be added in src/types.ts, not in the module that uses them
- Named exports only — no default export for types

## Restrictions

| Forbidden                      | Alternative                                   |
| ------------------------------ | --------------------------------------------- |
| `any`                          | Custom type in src/types.ts                   |
| `interface`                    | `type`                                        |
| `!` (non-null assertion)       | Guard with undefined check                    |
| Complex inline type            | Extract to src/types.ts with descriptive name |
| `as` type assertion on indices | Guard: `if (value === undefined) return`      |
| Types in module files          | Centralize in src/types.ts; import from there |

## Verification

```sh
npm run typecheck
```
