# Mission: Ship Deck as a Published CLI Tool

## Why
Herve vibecoded Deck — a browser-based local file editor — and wants to take over its development entirely. The goal is to understand every file, independently fix bugs, add features, and ship it as a published npm package that non-technical users can install and run.

## Success looks like
- Can read any file in the Deck codebase and explain what it does, why it's there, and how it connects to the rest
- Can independently fix bugs, add features, and refactor without AI generating the code
- `npx deck` works on any machine — published to npm with proper CLI distribution
- Multi-project support with automatic port management
- VS Code-level git integration (branches, inline diffs, blame, history)
- A theming system where users create and share themes via JSON files
- Non-markdown file editing, keyboard shortcuts, cross-file search

## Constraints
- Learning happens by building on the actual Deck codebase, not side exercises
- Solo developer workflow — no team processes needed
- End users are non-technical — the tool must be simple to install and use

## Out of scope
- Backend/database architecture (Deck is filesystem-only)
- Deployment/hosting (local CLI tool)
- Mobile/responsive design (desktop browser only)
