# Plan 002: TanStack Router with app layout, sidebar, and route shells

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ad215f4..HEAD -- src/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-server-cli.md
- **Category**: direction
- **Planned at**: commit `ad215f4`, 2026-06-18

## Why this matters

The client needs routing before any feature can be built. TanStack Router provides type-safe client-side routing. This plan sets up the router, the root layout with the shadcn sidebar containing the file tree, and placeholder route components for `/`, `/v/$path`, and `/d/$path`. Every subsequent plan (editor, diff viewer) plugs into these route shells.

## Current state

The frontend is a minimal Vite + React scaffold:

- `src/main.tsx` — renders `<ThemeProvider><App /></ThemeProvider>` into `#root`
  ```tsx
  import { StrictMode } from "react"
  import { createRoot } from "react-dom/client"
  import "./index.css"
  import App from "./App.tsx"
  import { ThemeProvider } from "@/components/theme-provider.tsx"
  
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
  ```
- `src/App.tsx` — placeholder with a Button component
  ```tsx
  import { Button } from "@/components/ui/button"
  export function App() {
    return (
      <div className="flex min-h-svh p-6">
        <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
          <div>
            <h1 className="font-medium">Project ready!</h1>
            ...
          </div>
        </div>
      </div>
    )
  }
  export default App
  ```
- `src/components/theme-provider.tsx` — full theme provider with dark/light/system toggle, localStorage persistence, and `d` keyboard shortcut. Exports `ThemeProvider` and `useTheme`.
- `src/components/ui/button.tsx` — shadcn Base UI button with variants (default, outline, secondary, ghost, destructive, link) and sizes.
- `src/lib/utils.ts` — exports `cn()` (clsx + tailwind-merge).
- `src/index.css` — Tailwind v4 setup with oklch CSS variables for light/dark themes, sidebar variables, Geist + DM Sans fonts.

Installed dependencies:

- `@tanstack/react-router@1.170.16`
- `react@19.2.6`, `react-dom@19.2.6`
- `lucide-react` for icons

Repo conventions:

- Components in `src/components/`, UI primitives in `src/components/ui/`
- Path alias `@/` → `./src/`
- `cn()` for merging Tailwind classes
- Base UI primitives (not Radix) via shadcn `base-luma` style
- `cva` for component variants

## Commands you will need

## Scope

**In scope** (files to create or modify):

- `src/main.tsx` (modify) — replace App with RouterProvider
- `src/App.tsx` (delete or gut) — no longer needed
- `src/router.tsx` (create) — router instance + route tree
- `src/routes/__root.tsx` (create) — root layout with sidebar
- `src/routes/index.tsx` (create) — home route
- `src/routes/v.$.tsx` (create) — file viewer route (splat for nested paths)
- `src/routes/d.$.tsx` (create) — diff viewer route (splat for nested paths)
- `src/components/Sidebar.tsx` (create) — sidebar component with file tree
- `src/components/FileTree.tsx` (create) — recursive file tree component
- `src/components/ThemeToggle.tsx` (create) — theme toggle button using `useTheme`

**Out of scope**:

- `src/components/theme-provider.tsx` — already works, do not modify
- `src/components/ui/button.tsx` — already works
- Any server code (`server/`, `cli.ts`)
- The actual editor or diff viewer implementations — those are plans 003 and 004

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>`
- One commit for the full plan

## Steps

### Step 1: Create the router configuration

Create `src/router.tsx`. Use TanStack Router's code-based route definitions (not file-based, to avoid the TanStack Router CLI/plugin dependency):

```tsx
// src/router.tsx
import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { HomePage } from "./routes/index"
import { FileViewRoute } from "./routes/v.$"
import { DiffViewRoute } from "./routes/d.$"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const fileViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/v/$",
  component: FileViewRoute,
})

const diffViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/d/$",
  component: DiffViewRoute,
})

const routeTree = rootRoute.addChildren([indexRoute, fileViewRoute, diffViewRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
```

**Important**: The `path: "/v/$"` syntax uses TanStack Router's splat route (`$`) to capture the full remaining path. This lets `/v/docs/README.md` capture `docs/README.md` as the splat param. Verify this works in TanStack Router v1.170 — if the splat syntax is different (e.g. `path: "/v/$path"` or `path: "/v/**"`), check `node_modules/@tanstack/react-router/dist/esm/route.d.ts` for the correct syntax. The param is accessed via `useParams({ strict: false })` and the splat value is in `params._splat`.

**Verify**: `bun run typecheck` → exit 0 (after all files created)

### Step 2: Create the root layout with sidebar

Create `src/routes/__root.tsx`:

```tsx
// src/routes/__root.tsx
import { Outlet } from "@tanstack/react-router"
import { Sidebar } from "@/components/Sidebar"

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
```

**Verify**: file exists with correct imports

### Step 3: Create the Sidebar component

Create `src/components/Sidebar.tsx`. This is a collapsible sidebar styled to match the shadcn sidebar pattern using the CSS variables already defined in `index.css` (`--sidebar`, `--sidebar-foreground`, `--sidebar-border`, etc.):

```tsx
// src/components/Sidebar.tsx
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { FileTree } from "./FileTree"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "./ui/button"
import { PanelLeft, GitCompare } from "lucide-react"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border p-3">
        {!collapsed && (
          <span className="font-heading text-sm font-semibold">stageone</span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>

      {/* Navigation */}
      {!collapsed && (
        <>
          <nav className="flex flex-col gap-1 p-2">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              Home
            </Link>
            <Link
              to="/d/$"
              params={{ _splat: "" }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <GitCompare className="size-4" />
              Diffs
            </Link>
          </nav>

          {/* File tree */}
          <div className="flex-1 overflow-y-auto border-t border-sidebar-border p-2">
            <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Files
            </div>
            <FileTree />
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-2">
            <ThemeToggle />
          </div>
        </>
      )}
    </aside>
  )
}
```

**Important**: Import `cn` from `@/lib/utils`. The sidebar uses existing CSS variables (`bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`) which are already defined in `src/index.css`. Use Tailwind classes that reference these variables as shown in the `@theme inline` block in `index.css` (e.g., `bg-sidebar` maps to `--color-sidebar`).

**Verify**: `bun run typecheck` → exit 0 (after all files created)

### Step 4: Create the FileTree component

Create `src/components/FileTree.tsx`. This fetches the tree from `/api/tree` and renders it recursively:

```tsx
// src/components/FileTree.tsx
import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ChevronRight, File, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

interface TreeNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: TreeNode[]
}

export function FileTree() {
  const [tree, setTree] = useState<TreeNode[]>([])

  useEffect(() => {
    fetch("/api/tree")
      .then((res) => res.json())
      .then(setTree)
      .catch(console.error)
  }, [])

  return (
    <div className="text-sm">
      {tree.map((node) => (
        <TreeNodeItem key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}

function TreeNodeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronRight
            className={cn("size-3 transition-transform", expanded && "rotate-90")}
          />
          <Folder className="size-3.5" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  const isMarkdown = node.name.endsWith(".md") || node.name.endsWith(".mdx")

  return (
    <button
      onClick={() => navigate({ to: "/v/$", params: { _splat: node.path } })}
      className="flex w-full items-center gap-1 rounded-md px-2 py-1 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className="size-3.5" />
      <span className={cn("truncate", isMarkdown && "text-sidebar-primary")}>
        {node.name}
      </span>
    </button>
  )
}
```

Markdown files are highlighted with the sidebar primary color to visually distinguish editable files from read-only code files.

**Verify**: `bun run typecheck` → exit 0

### Step 5: Create the ThemeToggle component

Create `src/components/ThemeToggle.tsx`:

```tsx
// src/components/ThemeToggle.tsx
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full justify-start gap-2"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </Button>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 6: Create route placeholder components

Create `src/routes/index.tsx`:

```tsx
// src/routes/index.tsx
export function HomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">stageone</h1>
        <p className="mt-2 text-muted-foreground">
          Select a file from the sidebar to start editing
        </p>
      </div>
    </div>
  )
}
```

Create `src/routes/v.$.tsx`:

```tsx
// src/routes/v.$.tsx
import { useParams } from "@tanstack/react-router"

export function FileViewRoute() {
  const params = useParams({ strict: false })
  const filePath = params._splat || ""

  return (
    <div className="h-full p-6">
      <div className="text-sm text-muted-foreground">
        File: <code className="rounded bg-muted px-1.5 py-0.5">{filePath}</code>
      </div>
      <p className="mt-4 text-muted-foreground">Editor will be implemented in plan 003.</p>
    </div>
  )
}
```

Create `src/routes/d.$.tsx`:

```tsx
// src/routes/d.$.tsx
import { useParams } from "@tanstack/react-router"

export function DiffViewRoute() {
  const params = useParams({ strict: false })
  const filePath = params._splat || ""

  return (
    <div className="h-full p-6">
      <div className="text-sm text-muted-foreground">
        Diff: <code className="rounded bg-muted px-1.5 py-0.5">{filePath || "all files"}</code>
      </div>
      <p className="mt-4 text-muted-foreground">Diff viewer will be implemented in plan 004.</p>
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 7: Wire up the router in main.tsx

Replace `src/main.tsx`:

```tsx
// src/main.tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { ThemeProvider } from "@/components/theme-provider"
import { router } from "./router"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
)
```

Delete `src/App.tsx` — it's fully replaced by the router.

**Verify**: `bun run typecheck` → exit 0

### Step 8: Visual verification

Run `bun run dev` to start the Vite dev server. Open the browser:

1. The page shows the sidebar on the left with "stageone" heading, Home/Diffs nav links, and a file tree section.
2. The main area shows the home page placeholder.
3. The file tree may show "Files" heading but no actual files (since the API server isn't running in dev mode — this is expected; the file tree will populate when running with the full server). If you want to test with the API, run `bun run dev:server` in another terminal and adjust the Vite config to proxy `/api` requests (optional, not required for this plan).
4. Clicking the theme toggle switches between light and dark mode.
5. The sidebar collapse button works.

**Verify**: The page loads without console errors. The layout renders correctly with sidebar and main content area.

## Test plan

No automated tests for v1. Verification is visual — the layout renders, routes switch, sidebar collapses.

## Done criteria

- \`bun run typecheck\` exits 0
- \`bun run lint\` exits 0
- \`src/router.tsx\` exists with route definitions for \`/\`, \`/v/$\`, \`/d/$\`
- \`src/routes/\_\_root.tsx\` exists with sidebar + outlet layout
- \`src/routes/index.tsx\`, \`src/routes/v.$.tsx\`, \`src/routes/d.$.tsx\` exist
- \`src/components/Sidebar.tsx\` exists with collapsible sidebar
- \`src/components/FileTree.tsx\` exists with recursive tree rendering
- \`src/components/ThemeToggle.tsx\` exists
- \`src/main.tsx\` uses \`RouterProvider\` (no more \`App\` component)
- \`src/App.tsx\` is deleted
- \`bun run dev\` → page loads with sidebar layout, no console errors
- No files outside the in-scope list are modified

## STOP conditions

Stop and report back if:

- TanStack Router v1.170 does not support `path: "/v/$"` splat syntax — check the docs or type definitions for the correct splat pattern before proceeding
- `useParams({ strict: false })` does not return `_splat` — the API may use a different key for splat params
- The existing `theme-provider.tsx` or `button.tsx` do not work with the new layout — do not modify them, report the incompatibility
- Tailwind classes like `bg-sidebar` or `text-sidebar-foreground` do not resolve — verify they're in the `@theme inline` block of `index.css`

## Maintenance notes

- The splat route (`/v/$`) captures everything after `/v/` as a single string. If TanStack Router changes splat behavior in a future version, the param access pattern in route components will need updating.
- The Sidebar uses `w-64` when expanded. If the design changes, update this value.
- The FileTree fetches from `/api/tree` on mount. In dev mode (Vite only, no server), this will 404. Consider adding a Vite proxy config (`server.proxy` in `vite.config.ts`) if dev-mode API access is needed — but this is not required for this plan.
- The `Link` to `/d/$` with `params={{ _splat: "" }}` for the global diffs view — verify this produces the URL `/d/` and not `/d` (trailing slash behavior).

