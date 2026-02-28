# Sessioner

✨ An interactive **CLI** to navigate and manage [**Claude Code**](https://docs.anthropic.com/en/docs/claude-code) sessions from the terminal.

[![NPM Version](https://img.shields.io/npm/v/sessioner.svg?label=&color=70a1ff&logo=npm&logoColor=white)](https://www.npmjs.com/package/sessioner)

---

## 💡 Why

Claude Code supports native forking from specific points, but can loses context like thoughts, references, choices, and subagents. It also provides no built-in way to search, browse, merge, prune, or trim sessions.

**Sessioner** gives you a keyboard-driven interface to manage those sessions directly, including a **full fork** that preserves subagents and all session data:

- Browse all sessions in a project, sorted by date
- Search text across all sessions with highlighted results
- Preview conversations before acting
- Fork, merge, prune, trim, rename, or delete sessions
- View session and project stats (duration, tokens, costs, tool usage)
- Batch-clean empty session files

---

## 📦 Install

```bash
npm i sessioner
```

---

## 🚀 Quick Start

```bash
sessioner
```

- The CLI detects your current project and opens a main menu.

### Options

| Flag               | Short | Description          | Default              |
| ------------------ | ----- | -------------------- | -------------------- |
| `--project <path>` | `-p`  | Project path         | Current directory    |
| `--base <path>`    | `-b`  | Agent base directory | `~/.claude/projects` |

---

## How It Works

1. Scans `{base}/{project}` for `.jsonl` session files
2. Shows a **main menu** (Sessions, Search, Stats, Clean)
3. Shows a **paginated session list** sorted by date (newest first)
4. Displays a **conversation preview** for the selected session (up to 10 messages)
5. Opens an **action menu** to operate on it

---

## 🛠️ Actions

> [!NOTE]
>
> Actions that modify session files (fork, merge, prune, trim, rename, delete, clean) require restarting the Claude Code extension to take effect.
>
> - In **VS Code**, you can use the **Reload Window** command (<kbd>Ctrl+Shift+P</kbd> / <kbd>Cmd+Shift+P</kbd> → `Developer: Reload Window`).

### ◌ Open

- Reveals the `.jsonl` session file in your native file explorer
- **macOS** (`Finder`), **Windows** (`Explorer`), and **Linux** (`xdg-open`)

---

### ◌ Search _(across all sessions)_

- Search for a text input _(case-insensitive)_
- Results grouped by session title, with match count and date
- Highlight matched text
- Paginated 10 matches at a time
- Clicking a match opens the session's action menu

---

### ◌ Fork

- Creates an independent copy of the entire session
- All UUIDs (messages and subagents) are remapped to forked session
- Prompts for a custom title after forking
- Switches context to the new forked session

---

### ◌ Merge

- Combines multiple sessions into a single new one
- Multi-select UI with checkboxes for choosing which sessions to include
- Sessions are concatenated in chronological order
- All UUIDs are remapped to avoid conflicts
- Subagent files are copied and remapped
- Prompts for a custom title after merging

---

### ◌ Prune

- Analyzes the session and reports what can be removed:
  - **Tool blocks**: `tool_use` and `tool_result` entries
  - **Empty messages**: no text content after tools are stripped
  - **System/IDE tags**: `<system-reminder>`, `<ide_selection>`, `<ide_opened_file>`
  - **Old custom titles**: duplicate `custom-title` entries (keeps the most recent)
  - **Short messages**: text under 50 characters (unselected by default)
- Provides checkbox selection for what to remove
- Repairs the parent-child UUID chain after pruning

---

### ◌ Trim

- Lists all messages in reverse order (newest first)
- Each line shows `[ YOU ]` or `[ LLM ]` followed by the message text
- Select the last message you want to keep
- Everything after the selected point is removed

---

### ◌ Stats

> 🚧 **WIP**

- **Session stats** (from the action menu): statistics for a single session
- **Project stats** (from the main menu): aggregated statistics across all sessions
- Both display:
  - Duration (time between first and last message)
  - Message counts (user vs assistant)
  - Token usage (input, output, cache creation, cache read)
  - Cost breakdown by model
  - Tool usage frequency
  - Subagent count
- Project stats also shows the total session count

---

### ◌ Rename

- Text input for the new title (<kbd>Esc</kbd> to cancel)
- Writes a `custom-title` entry to the session file (same format used by the Claude Code extension)

---

### ◌ Delete

- Shows exactly what will be deleted:
  - Session `.jsonl` file
  - Subagents directory (with file count)
- Removes the entry from the sessions index

---

### ◌ Clean _(main menu)_

- Batch-deletes empty session files
- Only appears when empty files exist
- Shows the count of empty sessions

---

## ⌨️ Navigation

- <kbd>Up</kbd> / <kbd>Down</kbd>: move cursor
- <kbd>Enter</kbd>: confirm
- <kbd>0</kbd>: exit
- <kbd>ESC</kbd>: go back one level at a time until exit
- <kbd>Ctrl+C</kbd>: exit

---

## Security Policy

Please check the [**SECURITY.md**](https://github.com/wellwelwel/sessioner/blob/main/SECURITY.md).

---

## Contributing

See the [**Contributing Guide**](https://github.com/wellwelwel/sessioner/blob/main/CONTRIBUTING.md) and please follow our [**Code of Conduct**](https://github.com/wellwelwel/sessioner/blob/main/CODE_OF_CONDUCT.md) 🚀

---

## Acknowledgements

[![Contributors](https://img.shields.io/github/contributors/wellwelwel/sessioner?label=Contributors)](https://github.com/wellwelwel/sessioner/graphs/contributors)

---

## License

**Sessioner** is under the [**MIT License**](https://github.com/wellwelwel/sessioner/blob/main/LICENSE).
