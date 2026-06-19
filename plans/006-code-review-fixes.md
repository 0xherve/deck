# Plan 006: Fix code review findings — error handling, Button reuse, async I/O

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 392bc92..HEAD -- server/ src/components/Sidebar.tsx src/components/ThemeToggle.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-server-cli.md, plans/002-client-routing.md
- **Category**: bug
- **Planned at**: commit `392bc92`, 2026-06-19

## Why this matters

Code review found 6 issues across plans 001 and 002. The most critical: `/api/file` returned JSON instead of plain text (already fixed — `c.json({path, content})` → `c.text(content)`). The remaining issues are: fragile error string matching in path traversal checks, no error handling on server startup, raw `<button>` elements bypassing the existing Button component, and synchronous I/O blocking the event loop.

## Current state

- `server/routes/files.ts` — path traversal catch blocks match `e.message === "Path traversal detected"` (lines 66, 84). The `/api/file` response was already fixed to `c.text(content)`.
  ```ts
  // lines 65-69
  } catch (e) {
    if (e instanceof Error && e.message === "Path traversal detected") {
      return c.text("Forbidden", 403)
    }
    return c.text("Not found", 404)
  }
  ```

- `server/middleware/security.ts` — throws plain `Error("Path traversal detected")` (line 7)
  ```ts
  export function resolveSafePath(rootDir: string, relativePath: string): string {
    const resolved = path.resolve(rootDir, relativePath)
    if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
      throw new Error("Path traversal detected")
    }
    return resolved
  }
  ```

- `server/index.ts` — calls `serve()` eagerly with no error handling (lines 42-48)
  ```ts
  const server = serve({
    fetch: app.fetch,
    port,
  })
  console.log(`StageOne running at http://localhost:${port}`)
  ```

- `cli.ts` — no error handling around `createServer` or `open` (lines 19-21)
  ```ts
  createServer(rootDir, port)
  await open(`http://localhost:${port}`)
  ```

- `src/components/Sidebar.tsx` — uses raw `<button>` at line 25 instead of the existing `Button` component from `@/components/ui/button`
- `src/components/ThemeToggle.tsx` — uses raw `<button>` at line 14 instead of `Button`

- The project uses `@tabler/icons-react` for icons (NOT lucide-react). Check existing imports — if current code imports from `lucide-react`, those should be switched to `@tabler/icons-react` equivalents.

Repo conventions:
- shadcn Button component at `src/components/ui/button.tsx` with variants: `ghost`, sizes: `icon-sm`, `icon-xs`
- `cn()` from `@/lib/utils`
- Icons: `@tabler/icons-react` (e.g., `IconPanelLeft`, `IconSun`, `IconMoon`)

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bun run typecheck`  | exit 0              |
| Lint      | `bun run lint`       | exit 0              |

## Scope

**In scope**:
- `server/middleware/security.ts` (modify) — add custom error class
- `server/routes/files.ts` (modify) — use `instanceof` check instead of string matching, convert to async I/O
- `server/routes/git.ts` (modify) — convert execSync to async exec
- `server/index.ts` (modify) — add callback-based startup with error handling
- `cli.ts` (modify) — handle startup errors, wait for server ready before opening browser
- `src/components/Sidebar.tsx` (modify) — use Button component, switch to Tabler icons
- `src/components/ThemeToggle.tsx` (modify) — use Button component, switch to Tabler icons
- `src/components/FileTree.tsx` (modify) — switch to Tabler icons if using lucide

**Out of scope**:
- `src/components/ui/button.tsx` — do not modify
- `src/components/theme-provider.tsx` — do not modify
- Route components, router config

## Git workflow

- Branch: work on current branch
- Commit style: `fix: <description>`
- One commit for the full plan

## Steps

### Step 1: Add a custom PathTraversalError class

In `server/middleware/security.ts`, replace the plain `Error` with a custom class:

```ts
export class PathTraversalError extends Error {
  constructor() {
    super("Path traversal detected")
    this.name = "PathTraversalError"
  }
}
```

Update `resolveSafePath` to throw `PathTraversalError` instead of `Error`.

**Verify**: `bun run typecheck` → exit 0

### Step 2: Update catch blocks in files.ts to use instanceof

In `server/routes/files.ts`, replace both catch blocks:

```ts
// Before:
if (e instanceof Error && e.message === "Path traversal detected") {

// After:
if (e instanceof PathTraversalError) {
```

Import `PathTraversalError` from `../middleware/security.ts`.

Also convert the synchronous file operations to async:
- `fs.readdirSync` → `fs.promises.readdir` (with `{ withFileTypes: true }`)
- `fs.readFileSync` → `fs.promises.readFile`
- `fs.writeFileSync` → `fs.promises.writeFile`
- Make `readTree` an `async function` and `await` its recursive calls

The route handlers are already async-capable since Hono supports async handlers.

**Verify**: `bun run typecheck` → exit 0

### Step 3: Convert git.ts to async

In `server/routes/git.ts`, replace `execSync` with `execFile` from `node:child_process` wrapped in a Promise, or use `util.promisify(exec)`:

```ts
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

// In the handler:
const { stdout } = await execAsync("git diff HEAD", {
  cwd: rootDir,
  maxBuffer: 10 * 1024 * 1024,
})
return c.json({ patch: stdout })
```

**Verify**: `bun run typecheck` → exit 0

### Step 4: Add server startup error handling

In `server/index.ts`, change `createServer` to return a Promise that resolves when the server is listening, or rejects on error. The `@hono/node-server` `serve()` returns a `Server` instance — listen for its `listening` and `error` events:

```ts
export function createServer(rootDir: string, port: number): Promise<ReturnType<typeof serve>> {
  return new Promise((resolve, reject) => {
    // ... app setup ...

    const server = serve({ fetch: app.fetch, port })

    server.on("listening", () => {
      console.log(`StageOne running at http://localhost:${port}`)
      console.log(`Serving project: ${rootDir}`)
      resolve(server)
    })

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} is already in use`))
      } else {
        reject(err)
      }
    })
  })
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 5: Update CLI to handle errors

In `cli.ts`, update the action to await `createServer` and handle errors:

```ts
.action(async (directory: string, options: { port: string }) => {
  const rootDir = path.resolve(directory)
  const port = parseInt(options.port, 10)

  try {
    await createServer(rootDir, port)
    await open(`http://localhost:${port}`)
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
})
```

**Verify**: `bun run typecheck` → exit 0

### Step 6: Replace raw buttons with Button component and switch to Tabler icons

First, check which icon library is currently imported in Sidebar.tsx, ThemeToggle.tsx, and FileTree.tsx. If they import from `lucide-react`, switch to `@tabler/icons-react` equivalents:

| lucide-react | @tabler/icons-react |
|---|---|
| `PanelLeft` | `IconLayoutSidebar` |
| `Home` | `IconHome` |
| `GitCompare` | `IconGitCompare` |
| `Sun` | `IconSun` |
| `Moon` | `IconMoon` |
| `ChevronRight` | `IconChevronRight` |
| `File` | `IconFile` |
| `Folder` | `IconFolder` |

In `src/components/Sidebar.tsx`:
- Import `Button` from `@/components/ui/button`
- Replace the raw `<button>` at line 25 with `<Button variant="ghost" size="icon-sm">`
- Switch all icon imports to `@tabler/icons-react`

In `src/components/ThemeToggle.tsx`:
- Import `Button` from `@/components/ui/button`
- Replace the raw `<button>` at line 14 with `<Button variant="ghost" size="icon-sm">`
- Switch icon imports to `@tabler/icons-react`

In `src/components/FileTree.tsx`:
- Switch icon imports to `@tabler/icons-react`

Tabler icons use `size` prop instead of className for sizing: `<IconHome size={16} />` or use `className="size-4"`.

**Verify**: `bun run typecheck` → exit 0

### Step 7: Remove lucide-react dependency if fully replaced

Check if any file still imports from `lucide-react`:
```
grep -rn "from ['\"]lucide-react" src/
```

If nothing found, remove it:
```
bun remove lucide-react
```

**Verify**: `bun run typecheck` → exit 0

## Test plan

- Start server with `bun run dev:server`, verify all API endpoints still respond correctly
- Start server on an already-used port, verify it prints an error and exits cleanly
- Verify path traversal still returns 403: `curl "http://localhost:5200/api/file?path=../../etc/passwd"`
- Verify file read still works: `curl "http://localhost:5200/api/file?path=package.json"`

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `PathTraversalError` class exists in `server/middleware/security.ts`
- [ ] No string-matching on error messages in `server/routes/files.ts`
- [ ] All file I/O in `server/routes/files.ts` is async
- [ ] `git diff` in `server/routes/git.ts` is async
- [ ] `createServer` returns a Promise; CLI handles startup errors
- [ ] No raw `<button>` in Sidebar.tsx or ThemeToggle.tsx — all use `Button` component
- [ ] All icon imports use `@tabler/icons-react`, not `lucide-react`
- [ ] `lucide-react` removed from package.json (if fully replaced)
- [ ] No files outside the in-scope list are modified

## STOP conditions

- `@hono/node-server` `serve()` does not return a Node.js `Server` instance with `on("listening")` / `on("error")` events — check the types
- `@tabler/icons-react` does not have equivalent icons for the ones being replaced — check with `grep -r "export.*Icon" node_modules/@tabler/icons-react/dist/esm/icons/`
- Async conversion of `readTree` causes issues with the recursive directory walk — if `fs.promises.readdir` with `withFileTypes` behaves differently, report

## Maintenance notes

- The `PathTraversalError` class is the single source of truth for traversal detection. Any new route that uses `resolveSafePath` should catch `PathTraversalError`, not match strings.
- The async I/O conversion means route handlers now return Promises. Hono handles this natively — no middleware changes needed.
- Tabler icons use a different naming convention (`Icon` prefix) and sizing approach (`size` prop or `stroke` prop). Be consistent: use `size={16}` for 4-unit icons, `size={14}` for 3.5-unit icons.
