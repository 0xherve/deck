# Plan 004: Git diff viewer with @pierre/diffs React component

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ad215f4..HEAD -- src/routes/d.$.tsx src/components/DiffViewer.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-server-cli.md, plans/002-client-routing.md
- **Category**: direction
- **Planned at**: commit `ad215f4`, 2026-06-18

## Why this matters

The diff viewer lets users review their git changes directly in the workspace without switching to a terminal. It uses `@pierre/diffs` which provides syntax-highlighted, split or unified diff views. This is the second core feature after the editor.

## Current state

After plan 002, the `/d/$` route exists as a placeholder. The API endpoint `GET /api/git-diff` (from plan 001) returns `{ patch: string }` containing the output of `git diff HEAD`.

`@pierre/diffs` is installed at v1.2.11. Key API (verified from type definitions):

**React components** (from `@pierre/diffs/react`):
- `PatchDiff` — takes a `patch: string` prop (unified diff output) and renders it. This is the simplest component for our use case.
  ```ts
  interface PatchDiffProps<LAnnotation> extends DiffBasePropsReact<LAnnotation> {
    patch: string;
    disableWorkerPool?: boolean;
  }
  ```
- `FileDiff` — takes a `fileDiff: FileDiffMetadata` object. More complex, for pre-parsed diffs.
- `File` — renders a single file with syntax highlighting (for the read-only code viewer).

**Base props** (`DiffBasePropsReact`):
```ts
interface DiffBasePropsReact<LAnnotation> {
  options?: FileDiffOptions<LAnnotation>;
  className?: string;
  style?: CSSProperties;
  // ... render callbacks, annotations, selectedLines
}
```

**Options** include layout (`split` vs `unified`), theme, line numbers, etc. These are set via the `options` prop.

**Theming**: `@pierre/diffs` has built-in themes accessed via `DiffsThemeNames`. The component injects its own styles via Shadow DOM/CSS.

**Worker pool**: `PatchDiff` can use a web worker for parsing. For simplicity, set `disableWorkerPool={true}` for v1 to avoid worker setup complexity.

## Commands you will need

| Purpose   | Command              | Expected on success       |
|-----------|----------------------|---------------------------|
| Typecheck | `bun run typecheck`  | exit 0, no errors         |
| Lint      | `bun run lint`       | exit 0                    |
| Dev       | `bun run dev`        | Vite dev server starts    |

## Scope

**In scope** (files to create or modify):
- `src/routes/d.$.tsx` (rewrite) — diff view route
- `src/components/DiffViewer.tsx` (create) — wrapper around PatchDiff

**Out of scope**:
- Server code (API already exists from plan 001)
- Editor components (plan 003)
- Sidebar (already has Diffs link from plan 002)
- Any git staging/commit UI — view only for v1

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>`
- One commit for the full plan

## Steps

### Step 1: Create the DiffViewer component

Create `src/components/DiffViewer.tsx`:

```tsx
// src/components/DiffViewer.tsx
import { PatchDiff } from "@pierre/diffs/react"

interface DiffViewerProps {
  patch: string
}

export function DiffViewer({ patch }: DiffViewerProps) {
  if (!patch.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Clean working directory</p>
          <p className="mt-1 text-sm">No changes detected against HEAD</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <PatchDiff
        patch={patch}
        disableWorkerPool
        options={{
          layout: "split",
        }}
      />
    </div>
  )
}
```

**Important**: The import is `from "@pierre/diffs/react"` — this is the React-specific entry point as shown in the package.json exports map. Do NOT import from `@pierre/diffs` directly for React components.

**Verify**: `bun run typecheck` → exit 0

**If typecheck fails** on the `options` prop: the `FileDiffOptions` type may require specific fields or the `layout` value may need to be typed differently. Check:
```
grep -r "layout" node_modules/@pierre/diffs/dist/types.d.ts | head -10
```
Adjust the options object to match the expected types.

### Step 2: Rewrite the diff route

Rewrite `src/routes/d.$.tsx`:

```tsx
// src/routes/d.$.tsx
import { useState, useEffect } from "react"
import { DiffViewer } from "@/components/DiffViewer"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function DiffViewRoute() {
  const [patch, setPatch] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDiff = () => {
    setLoading(true)
    setError(null)
    fetch("/api/git-diff")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch diff")
        return res.json()
      })
      .then((data: { patch: string }) => {
        setPatch(data.patch)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchDiff()
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Git Diff</span>
          <span className="text-muted-foreground">HEAD</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={fetchDiff} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading diff...
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center text-destructive">
            {error}
          </div>
        )}
        {!loading && !error && patch !== null && (
          <DiffViewer patch={patch} />
        )}
      </div>
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 3: Visual verification

Run the full stack:
1. `bun run build` then `bun run dev:server`
2. Make some changes to files in the project directory (or use a project with uncommitted changes)
3. Navigate to the Diffs page via sidebar

Expected:
1. The diff loads and displays with syntax highlighting in split view
2. If no changes, shows "Clean working directory" message
3. The refresh button re-fetches the diff
4. File headers show the changed file names
5. Added lines are green, removed lines are red (or whatever the `@pierre/diffs` default theme uses)

**Verify**: Diff renders correctly. No console errors.

**If `@pierre/diffs` does not render**: The component may need additional CSS or theme setup. Check:
- Does it inject its own styles via Shadow DOM? If so, it should work without additional CSS.
- Does it need a theme provider or CSS import? Check `node_modules/@pierre/diffs/dist/` for any CSS files.
- Try adding `import "@pierre/diffs/styles.css"` if such a file exists.

Report findings if the component doesn't render and the cause isn't obvious.

## Test plan

No automated tests for v1. Verification is visual in step 3.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `/d/` route shows git diff from `git diff HEAD`
- [ ] `PatchDiff` component renders with syntax highlighting
- [ ] Empty diff shows "Clean working directory" message
- [ ] Refresh button re-fetches the diff
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back if:

- `@pierre/diffs/react` does not export `PatchDiff` — check `node_modules/@pierre/diffs/dist/react/index.d.ts`
- `PatchDiff` requires a worker pool and `disableWorkerPool` is not a valid prop — check the type definitions
- The component renders but shows no content (blank area) — this likely means CSS/theme issues; investigate but do not spend more than 15 minutes
- TypeScript errors from `@pierre/diffs` types that cannot be resolved — the library is relatively new and types may have issues

## Maintenance notes

- `@pierre/diffs` is actively maintained (published 3 days ago as of planning). API may change between minor versions. Pin the version in package.json if stability is important.
- The `PatchDiff` component takes a raw unified diff string. If the git output format changes or `git diff HEAD` produces unexpected output, the component may not parse it correctly.
- The `disableWorkerPool` flag is used for simplicity. For large diffs, enabling the worker pool would improve performance but requires setting up a web worker entry point.
- The split layout may not work well on narrow screens. A future improvement could add a layout toggle (split/unified) or auto-detect based on viewport width.
- `@pierre/diffs` also exports a `File` component for rendering single files with syntax highlighting — this could be used in plan 003's non-markdown file viewer instead of a plain `<pre>` tag. That's a future enhancement.
