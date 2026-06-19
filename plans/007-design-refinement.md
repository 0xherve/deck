# Plan 005: Read-only syntax-highlighted code viewer for non-markdown files

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ad215f4..HEAD -- src/routes/v.$.tsx src/components/CodeViewer.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-tiptap-editor.md, plans/004-diff-viewer.md
- **Category**: direction
- **Planned at**: commit `ad215f4`, 2026-06-18

## Why this matters

Non-markdown files currently render as plain `<pre>` text with no syntax highlighting. Since `@pierre/diffs` bundles Shiki and exports a `File` component for single-file rendering, we can reuse it for read-only code viewing with zero additional dependencies. This gives syntax highlighting for free.

## Current state

After plan 003, the `/v/$` route handles non-markdown files with:

```tsx
// In src/routes/v.$.tsx, the non-markdown branch:
<pre className="p-6 font-mono text-sm">{editableContent}</pre>
```

`@pierre/diffs/react` exports a `File` component (verified from types):

```ts
interface FileProps<LAnnotation> {
  file: FileContents;
  options?: FileOptions<LAnnotation>;
  // ... className, style, etc.
}
```

`FileContents` type needs to be checked — it likely takes `{ content: string, language?: string, fileName?: string }` or similar. Check:

```
grep -A 10 "FileContents" node_modules/@pierre/diffs/dist/types.d.ts
```

## Commands you will need

## Scope

**In scope**:

- `src/components/CodeViewer.tsx` (create) — wrapper around `File` from `@pierre/diffs/react`
- `src/routes/v.$.tsx` (modify) — replace the `<pre>` block with `<CodeViewer>`

**Out of scope**:

- Everything else

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>`
- One commit

## Steps

### Step 1: Investigate the FileContents type

Run:

```
grep -B 2 -A 15 "interface FileContents" node_modules/@pierre/diffs/dist/types.d.ts
```

And:

```
grep -B 2 -A 15 "type FileContents" node_modules/@pierre/diffs/dist/types.d.ts
```

Determine what fields `FileContents` requires. You need at minimum: the file content as a string and the language/filename for syntax highlighting.

**Verify**: You know the shape of `FileContents`

### Step 2: Create the CodeViewer component

Create `src/components/CodeViewer.tsx` based on the `FileContents` shape discovered in step 1. Example (adjust based on actual types):

```tsx
// src/components/CodeViewer.tsx
import { File as FileView } from "@pierre/diffs/react"

interface CodeViewerProps {
  content: string
  filePath: string
}

export function CodeViewer({ content, filePath }: CodeViewerProps) {
  const extension = filePath.split(".").pop() || ""

  return (
    <div className="h-full overflow-auto">
      <FileView
        file={{
          content,
          fileName: filePath,
          // Adjust these fields based on the actual FileContents type
        }}
        disableWorkerPool
      />
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 3: Replace the pre tag in v.$.tsx

In `src/routes/v.$.tsx`, find the non-markdown branch that renders:

```tsx
<pre className="p-6 font-mono text-sm">{editableContent}</pre>
```

Replace with:

```tsx
import { CodeViewer } from "@/components/CodeViewer"
// ...
<CodeViewer content={editableContent} filePath={filePath} />
```

**Verify**: `bun run typecheck` → exit 0

### Step 4: Visual verification

Open a non-markdown file (e.g., `.ts`, `.tsx`, `.json`) in the workspace. It should render with syntax highlighting instead of plain monospace text.

**Verify**: Syntax highlighting works. No console errors.

## Test plan

No automated tests. Visual verification in step 4.

## Done criteria

- \`bun run typecheck\` exits 0
- Non-markdown files render with syntax highlighting via \`@pierre/diffs\` \`File\` component
- No files outside the in-scope list are modified

## STOP conditions

- `FileContents` type is incompatible with a simple `{ content, fileName }` shape — report what it actually requires
- `File` component from `@pierre/diffs/react` does not render standalone files (only works in diff context) — fall back to plain `<pre>` and report

## Maintenance notes

- This reuses the same Shiki instance that `@pierre/diffs` uses internally, so no additional language grammar loading is needed.
- If `@pierre/diffs` changes the `File` component API, this is the only place to update.

