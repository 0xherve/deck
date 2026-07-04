# Deck

A local-first code editor and file browser that runs in your browser. Point it at any directory and get a full editing environment with git integration, markdown editing, diffs, and source control.

## Usage

```bash
npx deck [directory]
```

Opens the current (or specified) directory in your browser at `localhost:5200`.

### Options

- `-p, --port <number>` — Port number (default: `5200`)

## Features

- File tree navigation and tabbed editing
- Syntax-highlighted code viewer
- Rich markdown editing (TipTap)
- Git diff viewer and source control panel
- Image and binary file previews
- Light/dark theme

## Development

```bash
# Backend
npm run dev

# Frontend
npm run dev:web
```

## Stack

- **Frontend:** React, TanStack Router, Tailwind CSS, TipTap, Vite
- **Backend:** Hono (Node), serves files and git data from the target directory
