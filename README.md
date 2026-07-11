# Deck

A local-first code editor and file browser that runs in your browser. Point it at any directory and get a full editing environment with git integration, markdown editing, diffs, and source control.

## Usage

```bash
# Run against a directory (or current directory)
npx deck [directory]
bunx deck [directory]
pnpx deck [directory]
```

Opens the directory in your browser. The first instance uses port 5200; each additional project gets the next free port.

### Commands

```bash
deck [directory]       # Start Deck for a directory (reopens if already running)
deck list              # Show all running Deck instances
deck stop <port>       # Stop a specific instance
deck stop all          # Stop all running instances
```

### Options

- `-p, --port <number>` — Override the port (default: next free port from 5200)

## Features

- **File browser** — Tree navigation and tabbed editing
- **Code editing** — Edit any text or code file and save to disk
- **Markdown editor** — Rich WYSIWYG editing powered by TipTap (read, edit, and source modes)
- **Git diffs** — Stacked (unified) per-file diffs from the source control panel
- **Source control** — Stage, unstage, commit, push, pull, stash, and branch operations
- **Branch management** — List, create, and check out git branches from the UI
- **Multi-project** — Run multiple projects simultaneously, each on its own port
- **Shortcuts** — Cmd/Ctrl+S save, Cmd/Ctrl+P quick open, Cmd/Ctrl+Shift+P command palette, Alt/Option+W close tab
- **Themes** — Light and dark mode

## Development

```bash
# Install dependencies
bun install

# Start the backend (serves files + API)
bun dev

# Start the frontend dev server (with HMR)
bun dev:web

# Build for distribution
bun run build
```

## Stack

- **Frontend:** React, TanStack Router, Tailwind CSS v4, TipTap, Vite
- **Backend:** Hono (Node.js), serves files and git data from the target directory
- **CLI:** Commander, tracks instances under `/tmp/deck/instances/`

## Future

These features are on the wishlist but deferred from v0.1:

- Compiled single-file binary (`bun --compile`)
- JSON-based / shareable themes and a `~/.deck` config directory
- Inline gutter diffs inside the code editor
- Git blame and per-file commit history
- Merge UI and automatic stash-then-checkout
- Cross-file content search (grep)
- Monaco/CodeMirror-class editing with LSP, multi-cursor, autocomplete
- Customizable keybinding configuration
- Remote / non-localhost access
