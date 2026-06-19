# Plan 001: Hono server + Commander CLI launches the app and serves the API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ad215f4..HEAD -- cli.ts server/ package.json vite.config.ts tsconfig.node.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ad215f4`, 2026-06-18

## Why this matters

This is the foundation layer — nothing else works without a server to serve the API and built frontend, and a CLI to launch it. The Hono server provides file-system and git-diff API endpoints that every frontend feature depends on. The Commander CLI is the user-facing entry point (`stageone` command). Without this, the app is just a Vite dev scaffold with no backend.

## Current state

The project is a fresh Vite + React + shadcn scaffold. There is no server or CLI code. Relevant existing files:

- `package.json` — has `"type": "module"`, scripts for `dev`/`build`/`lint`/`typecheck`. No `bin` field yet.
  ```json
  {
    "name": "stageone",
    "private": true,
    "version": "0.0.1",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc -b && vite build",
      "lint": "eslint .",
      "format": "prettier --write \"**/*.{ts,tsx}\"",
      "typecheck": "tsc --noEmit",
      "preview": "vite preview"
    }
  }
  ```
- `vite.config.ts` — standard Vite config with React plugin, Tailwind plugin, and `@` alias to `./src`.
  ```ts
  import path from "path"
  import tailwindcss from "@tailwindcss/vite"
  import react from "@vitejs/plugin-react"
  import { defineConfig } from "vite"

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  })
  ```
- `tsconfig.node.json` — covers `vite.config.ts` only. Will need to also cover `server/` and `cli.ts`.
  ```json
  {
    "compilerOptions": {
      "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
      "target": "es2023",
      "lib": ["ES2023"],
      "module": "esnext",
      "types": ["node"],
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "verbatimModuleSyntax": true,
      "moduleDetection": "force",
      "noEmit": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "erasableSyntaxOnly": true,
      "noFallthroughCasesInSwitch": true
    },
    "include": ["vite.config.ts"]
  }
  ```
- `index.html` — Vite entry point at project root, loads `/src/main.tsx`.

Installed dependencies (already in `package.json`):
- `commander@15.0.0`
- `hono@4.12.26`
- `@hono/node-server@2.0.5`
- `open@11.0.0`
- `tsx@4.22.4` (dev)

Repo conventions:
- ES modules (`"type": "module"`)
- TypeScript strict mode
- `@/` path alias for `./src/`
- Geist + DM Sans fonts (frontend only, not relevant here)
- Single commit so far: `ad215f4 feat: initial commit`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun run typecheck`      | exit 0, no errors   |
| Lint      | `bun run lint`           | exit 0              |
| Dev test  | `bun run dev:server`     | Server starts, prints URL |
| Build     | `bun run build`          | exit 0, `dist/` created   |

## Scope

**In scope** (files to create or modify):
- `cli.ts` (create) — Commander entry point
- `server/index.ts` (create) — Hono app factory
- `server/routes/files.ts` (create) — file tree, read, save endpoints
- `server/routes/git.ts` (create) — git diff endpoint
- `server/middleware/security.ts` (create) — path traversal + origin checking
- `package.json` (modify) — add `bin`, add dev scripts
- `tsconfig.node.json` (modify) — include `server/` and `cli.ts`
- `vite.config.ts` (modify) — set `build.outDir` to `dist/client`

**Out of scope** (do NOT touch):
- Anything in `src/` — that's the frontend, handled by other plans
- `tsconfig.app.json` — frontend TypeScript config
- `index.html` — Vite handles this
- `components.json` — shadcn config

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>` (matches existing `feat: initial commit`)
- One commit for the full plan

## Steps

### Step 1: Create the security middleware

Create `server/middleware/security.ts` with two utilities:

1. **Path traversal guard**: a function that takes `(rootDir: string, requestedPath: string)` and returns the resolved absolute path, or throws if the resolved path escapes `rootDir`.
2. **Origin checking middleware**: a Hono middleware that checks the `Origin` header on incoming requests. If `Origin` is present and does not contain `localhost` or `127.0.0.1`, respond 403.

```ts
// server/middleware/security.ts
import path from "node:path"
import type { MiddlewareHandler } from "hono"

export function resolveSafePath(rootDir: string, relativePath: string): string {
  const resolved = path.resolve(rootDir, relativePath)
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

export const originGuard: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header("origin")
  if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return c.text("Forbidden", 403)
  }
  await next()
}
```

**Verify**: `bun run typecheck` → exit 0 (after step 4 completes the tsconfig changes; if checking incrementally, just confirm the file has no red squiggles in your editor or skip to step 4's verification)

### Step 2: Create the file-system API routes

Create `server/routes/files.ts`. This module exports a Hono app (sub-router) with three endpoints:

- `GET /api/tree` — recursively reads the directory tree from `rootDir`, filtering out dotfiles and `node_modules`. Returns JSON array of `{ name, path, type, children? }`.
- `GET /api/file?path=<relative>` — reads a single file's contents as UTF-8 text. Uses `resolveSafePath` to validate.
- `POST /api/save` — accepts `{ path: string, content: string }` as JSON body, writes to disk. Uses `resolveSafePath` to validate.

The `rootDir` should be passed into a factory function so the routes are parameterized:

```ts
// server/routes/files.ts
import { Hono } from "hono"
import fs from "node:fs"
import path from "node:path"
import { resolveSafePath } from "../middleware/security.js"

interface TreeNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: TreeNode[]
}

function readTree(dirPath: string, rootDir: string): TreeNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const results: TreeNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue
    const fullPath = path.join(dirPath, entry.name)
    const relativePath = path.relative(rootDir, fullPath)

    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: readTree(fullPath, rootDir),
      })
    } else {
      results.push({ name: entry.name, path: relativePath, type: "file" })
    }
  }
  return results
}

export function createFileRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/tree", (c) => {
    try {
      return c.json(readTree(rootDir, rootDir))
    } catch (e) {
      return c.text(String(e), 500)
    }
  })

  app.get("/api/file", (c) => {
    const filePath = c.req.query("path")
    if (!filePath) return c.text("Missing path parameter", 400)
    try {
      const safe = resolveSafePath(rootDir, filePath)
      const content = fs.readFileSync(safe, "utf-8")
      return c.text(content)
    } catch {
      return c.text("File not found or access denied", 404)
    }
  })

  app.post("/api/save", async (c) => {
    const body = await c.req.json<{ path: string; content: string }>()
    try {
      const safe = resolveSafePath(rootDir, body.path)
      fs.writeFileSync(safe, body.content, "utf-8")
      return c.json({ status: "saved" })
    } catch {
      return c.text("Save failed or access denied", 403)
    }
  })

  return app
}
```

**Verify**: `bun run typecheck` → exit 0 (after step 4)

### Step 3: Create the git diff API route

Create `server/routes/git.ts`:

- `GET /api/git-diff` — runs `git diff HEAD` in `rootDir` using `execSync`, returns `{ patch: string }`. If git fails or there are no changes, returns `{ patch: "" }`.

```ts
// server/routes/git.ts
import { Hono } from "hono"
import { execSync } from "node:child_process"

export function createGitRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/git-diff", (c) => {
    try {
      const patch = execSync("git diff HEAD", {
        cwd: rootDir,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      })
      return c.json({ patch })
    } catch {
      return c.json({ patch: "" })
    }
  })

  return app
}
```

**Verify**: `bun run typecheck` → exit 0 (after step 4)

### Step 4: Create the Hono server entry point

Create `server/index.ts`. This is the server factory — it takes a `rootDir` and `port`, wires up middleware and routes, and returns a start function:

```ts
// server/index.ts
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { originGuard } from "./middleware/security.js"
import { createFileRoutes } from "./routes/files.js"
import { createGitRoutes } from "./routes/git.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createServer(rootDir: string, port: number) {
  const app = new Hono()

  app.use("*", originGuard)

  app.route("/", createFileRoutes(rootDir))
  app.route("/", createGitRoutes(rootDir))

  // Serve the pre-built Vite client in production
  const clientDir = path.resolve(__dirname, "../dist/client")
  app.use("/*", serveStatic({ root: clientDir }))

  // SPA fallback — serve index.html for all non-API routes
  app.get("*", serveStatic({ root: clientDir, path: "/index.html" }))

  return {
    start() {
      serve({ fetch: app.fetch, port }, (info) => {
        console.log(`Stageone running at http://localhost:${info.port}`)
      })
    },
  }
}
```

**Note on static serving**: The `serveStatic` from `@hono/node-server/serve-static` serves from the filesystem. The `clientDir` path resolves relative to the compiled server location. In dev mode, the Vite dev server handles the frontend instead; in production the built client lives in `dist/client/`.

**Verify**: `bun run typecheck` → exit 0

### Step 5: Create the CLI entry point

Create `cli.ts` at the project root:

```ts
#!/usr/bin/env node
import { Command } from "commander"
import { createServer } from "./server/index.js"
import open from "open"
import path from "node:path"

const program = new Command()

program
  .name("stageone")
  .description("Launch a local markdown workspace in your browser")
  .argument("[directory]", "Directory to serve", ".")
  .option("-p, --port <number>", "Port number", "5200")
  .action((directory: string, options: { port: string }) => {
    const rootDir = path.resolve(directory)
    const port = parseInt(options.port, 10)
    const server = createServer(rootDir, port)
    server.start()
    open(`http://localhost:${port}`)
  })

program.parse()
```

**Verify**: `bun run typecheck` → exit 0

### Step 6: Update tsconfig.node.json

Expand `include` to cover the server code and CLI:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "cli.ts", "server/**/*.ts"]
}
```

**Verify**: `bun run typecheck` → exit 0, no errors

### Step 7: Update package.json

Add the `bin` field and new scripts:

```json
{
  "bin": {
    "stageone": "./cli.ts"
  },
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx cli.ts",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "format": "prettier --write \"**/*.{ts,tsx}\"",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

Note: `bin` points to `cli.ts` which has the shebang `#!/usr/bin/env node`. When installed via `npm link`, Node will execute it. Since we use `tsx` for dev, the `.ts` extension works. For production distribution, the build step would compile this to JS — but that's a future concern; for now `tsx` handles it via the shebang + `npx tsx` or having `tsx` as a dependency.

**Important**: Actually, for the bin to work without tsx globally installed, we should use `#!/usr/bin/env -S npx tsx` as the shebang, OR compile the CLI to JS during build. The simpler approach for now: keep `#!/usr/bin/env node` and have the bin point to a compiled version. But for development, `bun run dev:server` with `tsx` is the workflow.

Revisit: the `bin` field should point to `./cli.ts` for now with `tsx` as a runtime dependency. The user runs `bun run dev:server` during development. Production distribution will be addressed in a separate plan.

**Verify**: `bun run typecheck` → exit 0

### Step 8: Update vite.config.ts build output

Set `build.outDir` so the Vite build goes to `dist/client` (matching what the server expects):

```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist/client",
  },
})
```

**Verify**: `bun run build` → exit 0, `dist/client/index.html` exists

### Step 9: Smoke test

Run `bun run dev:server` (which executes `tsx cli.ts`). The server should start and print `Stageone running at http://localhost:5200`. Since there's no built client yet (unless you ran `bun run build` first), the API endpoints should still respond:

- `curl http://localhost:5200/api/tree` → returns a JSON array of the project's file tree
- `curl http://localhost:5200/api/git-diff` → returns `{"patch":"..."}` or `{"patch":""}`

**Verify**: Both curl commands return valid JSON responses. Kill the server with Ctrl+C after verification.

## Test plan

No automated tests for v1 — the verification is the smoke test in step 9. The server is a thin wrapper around `fs` and `execSync`; the security middleware is tested implicitly by attempting path traversal in the smoke test:

- `curl http://localhost:5200/api/file?path=../../etc/passwd` → should return 404/403, not file contents

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] `cli.ts` exists with Commander setup and shebang
- [ ] `server/index.ts` exists and exports `createServer`
- [ ] `server/routes/files.ts` exists with `/api/tree`, `/api/file`, `/api/save`
- [ ] `server/routes/git.ts` exists with `/api/git-diff`
- [ ] `server/middleware/security.ts` exists with `resolveSafePath` and `originGuard`
- [ ] `package.json` has `bin.stageone` and `dev:server` script
- [ ] `vite.config.ts` has `build.outDir: "dist/client"`
- [ ] `bun run dev:server` starts the server and `curl http://localhost:5200/api/tree` returns JSON
- [ ] `curl http://localhost:5200/api/file?path=../../etc/passwd` returns 403 or 404
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back if:

- `@hono/node-server` does not export `serveStatic` from `@hono/node-server/serve-static` — the API may have changed
- `commander` v15 has a different API for `.argument()` or `.option()` — check `node_modules/commander/typings/index.d.ts`
- `open` v11 does not have a default export — check its package.json exports
- TypeScript errors that cannot be resolved by adjusting the code in scope

## Maintenance notes

- The `serveStatic` setup assumes the built client is in `dist/client/` relative to the server file. If the build output path changes, update both `vite.config.ts` and `server/index.ts`.
- The SPA fallback (`app.get("*", ...)`) must come after all API routes to avoid swallowing API 404s.
- The `resolveSafePath` function uses `path.sep` to check containment. On Windows, `path.sep` is `\` — this should still work but has not been tested on Windows.
- The git diff endpoint uses `execSync` which blocks the event loop. For repos with very large diffs this could cause momentary hangs. If this becomes a problem, switch to `execFile` with a callback or `child_process.spawn`.
