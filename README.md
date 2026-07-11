# Deck

A local-first code editor and file browser that runs in your browser. Point it at any directory and get a full editing environment with git integration, markdown editing, diffs, and source control.

## Install

```bash
npm install -g @0xherve/deck
```

Then use `deck` from anywhere:

```bash
deck              # open current directory
deck ~/my-project # open a specific directory
```

The first instance uses port 5200; each additional project gets the next free port.

`npx deck`, `pnpm dlx deck`, and `bunx deck` also work, but global install is the intended workflow.

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

## Releasing

CI runs on every push/PR (see `[.github/workflows/ci.yml](.github/workflows/ci.yml)`).

To publish a release, finish the TODOs in `[.github/workflows/release.yml](.github/workflows/release.yml)`, then:

```bash
# 1. Bump version in package.json
# 2. Commit and tag (tag must match version, with a v prefix)
git tag v0.1.0
git push origin main --tags
```

GitHub Actions will build and publish when the tag is pushed.

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
- LSP, and better code editing functionalities 
- Customizable keybinding configuration
- Remote / non-localhost access

