# Plan 003: Tiptap markdown editor with tabs, three view states, and auto-save

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat ad215f4..HEAD -- src/routes/v.$.tsx src/components/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/002-client-routing.md
- **Category**: direction
- **Planned at**: commit `ad215f4`, 2026-06-18

## Why this matters

This is the core feature — the reason the app exists. Users open markdown files, read them in rendered form, edit in WYSIWYG or raw source mode, and changes auto-save to disk. Without this, the app is an empty shell with placeholder routes.

## Current state

After plan 002, the `/v/$` route exists as a placeholder that shows the file path. The following are relevant:

- `src/routes/v.$.tsx` — placeholder, will be fully replaced
- `src/components/FileTree.tsx` — navigates to `/v/$` with the file path as splat param
- API endpoints (from plan 001):
  - `GET /api/file?path=<relative>` — returns file content as UTF-8 text
  - `POST /api/save` — accepts `{ path: string, content: string }` JSON body

Installed dependencies:
- `@tiptap/react@3.27.0` — React bindings for Tiptap
- `@tiptap/core@3.27.0` — editor core
- `@tiptap/starter-kit@3.27.0` — paragraph, headings, bold, italic, code, lists, blockquote, undo/redo
- `@tiptap/pm@3.27.0` — ProseMirror peer dependency
- `@tiptap/markdown@3.27.0` — bidirectional markdown parsing/serialization

Key API from `@tiptap/markdown` (verified from `node_modules/@tiptap/markdown/dist/index.d.ts`):
- It's a Tiptap `Extension` — you add it to the extensions array: `Markdown.configure({ ... })`
- The extension adds `editor.storage.markdown.getMarkdown()` to extract markdown from the editor content
- It can parse markdown strings passed to `editor.commands.setContent(markdownString)`

Key API from `@tiptap/react`:
- `useEditor({ extensions, content, editable, onUpdate })` — creates an editor instance
- `<EditorContent editor={editor} />` — renders the editor

Repo conventions:
- `cn()` from `@/lib/utils` for class merging
- shadcn Base UI components in `src/components/ui/`
- Tailwind with oklch CSS variables
- `font-heading` for DM Sans headings, `font-sans` for Geist body text

## Commands you will need

| Purpose   | Command              | Expected on success       |
|-----------|----------------------|---------------------------|
| Typecheck | `bun run typecheck`  | exit 0, no errors         |
| Lint      | `bun run lint`       | exit 0                    |
| Dev       | `bun run dev`        | Vite dev server starts    |

## Scope

**In scope** (files to create or modify):
- `src/routes/v.$.tsx` (rewrite) — file view route with editor
- `src/components/MarkdownEditor.tsx` (create) — Tiptap WYSIWYG editor component
- `src/components/SourceEditor.tsx` (create) — raw markdown textarea editor
- `src/components/EditorTabs.tsx` (create) — tab bar for open files
- `src/components/EditorToolbar.tsx` (create) — toolbar with view state toggle + save indicator
- `src/hooks/useFileContent.ts` (create) — fetch file content from API
- `src/hooks/useAutoSave.ts` (create) — debounced auto-save with session storage buffer
- `src/stores/tabs.ts` (create) — tab state management (open tabs, active tab, dirty state)

**Out of scope**:
- `src/components/FileTree.tsx` — already navigates to `/v/$`, no changes needed
- `src/components/Sidebar.tsx` — no changes needed
- Any server code
- The diff viewer (plan 004)
- Adding new shadcn UI components — use existing `Button` + raw HTML/Tailwind for the toolbar and tabs. If you need a shadcn `Tabs` component, run `bunx shadcn@latest add tabs` but only if the existing button component is insufficient.

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>`
- One commit for the full plan

## Steps

### Step 1: Create the tab store

Create `src/stores/tabs.ts`. Use React context + useReducer for tab state. Each tab tracks: file path, whether it has unsaved changes (dirty), and its session storage key.

```ts
// src/stores/tabs.ts
import { createContext, useContext } from "react"

export interface Tab {
  path: string
  dirty: boolean
}

export interface TabsState {
  tabs: Tab[]
  activeTab: string | null
}

export type TabsAction =
  | { type: "OPEN_TAB"; path: string }
  | { type: "CLOSE_TAB"; path: string }
  | { type: "SET_ACTIVE"; path: string }
  | { type: "SET_DIRTY"; path: string; dirty: boolean }

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case "OPEN_TAB": {
      const exists = state.tabs.some((t) => t.path === action.path)
      if (exists) {
        return { ...state, activeTab: action.path }
      }
      return {
        tabs: [...state.tabs, { path: action.path, dirty: false }],
        activeTab: action.path,
      }
    }
    case "CLOSE_TAB": {
      const filtered = state.tabs.filter((t) => t.path !== action.path)
      let activeTab = state.activeTab
      if (state.activeTab === action.path) {
        const idx = state.tabs.findIndex((t) => t.path === action.path)
        activeTab = filtered[Math.min(idx, filtered.length - 1)]?.path ?? null
      }
      // Clean up session storage
      sessionStorage.removeItem(`stageone:buffer:${action.path}`)
      return { tabs: filtered, activeTab }
    }
    case "SET_ACTIVE":
      return { ...state, activeTab: action.path }
    case "SET_DIRTY":
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.path === action.path ? { ...t, dirty: action.dirty } : t
        ),
      }
    default:
      return state
  }
}

export const TabsContext = createContext<{
  state: TabsState
  dispatch: React.Dispatch<TabsAction>
} | null>(null)

export function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("useTabs must be used within TabsProvider")
  return ctx
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 2: Create the useFileContent hook

Create `src/hooks/useFileContent.ts`:

```ts
// src/hooks/useFileContent.ts
import { useState, useEffect } from "react"

export function useFileContent(filePath: string | null) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filePath) {
      setContent(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [filePath])

  return { content, loading, error }
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 3: Create the useAutoSave hook

Create `src/hooks/useAutoSave.ts`. This buffers changes in sessionStorage and flushes to disk after 2-3 seconds of inactivity:

```ts
// src/hooks/useAutoSave.ts
import { useRef, useCallback, useEffect } from "react"

const DEBOUNCE_MS = 2500

export function useAutoSave(
  filePath: string | null,
  onDirtyChange: (dirty: boolean) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string | null>(null)

  const bufferKey = filePath ? `stageone:buffer:${filePath}` : null

  const save = useCallback(
    async (content: string) => {
      if (!filePath) return
      try {
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content }),
        })
        lastSavedRef.current = content
        onDirtyChange(false)
      } catch (e) {
        console.error("Auto-save failed:", e)
      }
    },
    [filePath, onDirtyChange]
  )

  const bufferChange = useCallback(
    (content: string) => {
      if (!bufferKey) return

      // Write to session storage immediately
      sessionStorage.setItem(bufferKey, content)
      onDirtyChange(true)

      // Debounce the disk write
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => save(content), DEBOUNCE_MS)
    },
    [bufferKey, save, onDirtyChange]
  )

  // Get buffered content (if any) for the current file
  const getBufferedContent = useCallback((): string | null => {
    if (!bufferKey) return null
    return sessionStorage.getItem(bufferKey)
  }, [bufferKey])

  // Flush on unmount if there are pending changes
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        if (bufferKey) {
          const buffered = sessionStorage.getItem(bufferKey)
          if (buffered && buffered !== lastSavedRef.current) {
            // Fire-and-forget save on unmount
            fetch("/api/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: filePath, content: buffered }),
            }).catch(() => {})
          }
        }
      }
    }
  }, [filePath, bufferKey])

  return { bufferChange, getBufferedContent }
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 4: Create the MarkdownEditor component

Create `src/components/MarkdownEditor.tsx`. This wraps Tiptap with the markdown extension:

```tsx
// src/components/MarkdownEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import { useEffect } from "react"

interface MarkdownEditorProps {
  content: string
  editable: boolean
  onChange?: (markdown: string) => void
}

export function MarkdownEditor({ content, editable, onChange }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const md = editor.storage.markdown.getMarkdown()
        onChange(md)
      }
    },
  })

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // Update content when file changes (new file loaded)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = editor.storage.markdown.getMarkdown()
      if (currentMd !== content) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  if (!editor) return null

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm dark:prose-invert max-w-none [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-6"
    />
  )
}
```

**Important**: The `Markdown` extension is imported from `@tiptap/markdown`. Verify this import works — check `node_modules/@tiptap/markdown/dist/index.d.ts` for the exact export name. It may be a named export `Markdown` or a default export. The types show a `MarkdownManager` class — the extension itself might be accessed differently. Check:
```
grep -r "export" node_modules/@tiptap/markdown/dist/index.d.ts | head -20
```
If the export is different (e.g., `MarkdownExtension` or requires `Markdown.configure()`), adjust accordingly.

**Verify**: `bun run typecheck` → exit 0

### Step 5: Create the SourceEditor component

Create `src/components/SourceEditor.tsx`. This is a plain textarea for raw markdown editing:

```tsx
// src/components/SourceEditor.tsx
interface SourceEditorProps {
  content: string
  editable: boolean
  onChange?: (content: string) => void
}

export function SourceEditor({ content, editable, onChange }: SourceEditorProps) {
  return (
    <textarea
      value={content}
      readOnly={!editable}
      onChange={(e) => onChange?.(e.target.value)}
      className="h-full w-full resize-none bg-background p-6 font-mono text-sm text-foreground outline-none"
      spellCheck={false}
    />
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 6: Create the EditorTabs component

Create `src/components/EditorTabs.tsx`:

```tsx
// src/components/EditorTabs.tsx
import { useTabs } from "@/stores/tabs"
import { useNavigate } from "@tanstack/react-router"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function EditorTabs() {
  const { state, dispatch } = useTabs()
  const navigate = useNavigate()

  if (state.tabs.length === 0) return null

  return (
    <div className="flex items-center gap-0 border-b border-border bg-muted/30 overflow-x-auto">
      {state.tabs.map((tab) => {
        const fileName = tab.path.split("/").pop() || tab.path
        const isActive = tab.path === state.activeTab

        return (
          <div
            key={tab.path}
            className={cn(
              "group flex items-center gap-1.5 border-r border-border px-3 py-2 text-sm cursor-pointer",
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-background/50"
            )}
            onClick={() => {
              dispatch({ type: "SET_ACTIVE", path: tab.path })
              navigate({ to: "/v/$", params: { _splat: tab.path } })
            }}
          >
            {tab.dirty && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
            <span className="truncate max-w-32">{fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ type: "CLOSE_TAB", path: tab.path })
                if (isActive) {
                  const remaining = state.tabs.filter((t) => t.path !== tab.path)
                  if (remaining.length > 0) {
                    const idx = state.tabs.findIndex((t) => t.path === tab.path)
                    const next = remaining[Math.min(idx, remaining.length - 1)]
                    navigate({ to: "/v/$", params: { _splat: next.path } })
                  } else {
                    navigate({ to: "/" })
                  }
                }
              }}
              className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 7: Create the EditorToolbar component

Create `src/components/EditorToolbar.tsx` with the three-state toggle (Read / WYSIWYG / Source):

```tsx
// src/components/EditorToolbar.tsx
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Code } from "lucide-react"
import { cn } from "@/lib/utils"

export type EditorMode = "read" | "wysiwyg" | "source"

interface EditorToolbarProps {
  filePath: string
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  dirty: boolean
}

export function EditorToolbar({ filePath, mode, onModeChange, dirty }: EditorToolbarProps) {
  const modes: { value: EditorMode; label: string; icon: React.ReactNode }[] = [
    { value: "read", label: "Read", icon: <Eye className="size-3.5" /> },
    { value: "wysiwyg", label: "Edit", icon: <Pencil className="size-3.5" /> },
    { value: "source", label: "Source", icon: <Code className="size-3.5" /> },
  ]

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{filePath}</code>
        {dirty && (
          <span className="text-xs text-primary">Unsaved</span>
        )}
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
        {modes.map((m) => (
          <Button
            key={m.value}
            variant="ghost"
            size="xs"
            className={cn(
              "gap-1",
              mode === m.value && "bg-background shadow-sm"
            )}
            onClick={() => onModeChange(m.value)}
          >
            {m.icon}
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 8: Rewrite the file view route

Rewrite `src/routes/v.$.tsx` to integrate everything:

```tsx
// src/routes/v.$.tsx
import { useParams } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { useTabs } from "@/stores/tabs"
import { useFileContent } from "@/hooks/useFileContent"
import { useAutoSave } from "@/hooks/useAutoSave"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { SourceEditor } from "@/components/SourceEditor"
import { EditorToolbar, type EditorMode } from "@/components/EditorToolbar"
import { EditorTabs } from "@/components/EditorTabs"
import { File as FileIcon } from "lucide-react"

export function FileViewRoute() {
  const params = useParams({ strict: false })
  const filePath = params._splat || ""
  const { state, dispatch } = useTabs()
  const { content, loading, error } = useFileContent(filePath)
  const [mode, setMode] = useState<EditorMode>("read")
  const [editableContent, setEditableContent] = useState<string>("")

  const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".mdx")

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      dispatch({ type: "SET_DIRTY", path: filePath, dirty })
    },
    [dispatch, filePath]
  )

  const { bufferChange, getBufferedContent } = useAutoSave(filePath, handleDirtyChange)

  // Open tab when navigating to a file
  useEffect(() => {
    if (filePath) {
      dispatch({ type: "OPEN_TAB", path: filePath })
    }
  }, [filePath, dispatch])

  // Initialize content from session buffer or API
  useEffect(() => {
    if (content !== null) {
      const buffered = getBufferedContent()
      setEditableContent(buffered ?? content)
      if (buffered && buffered !== content) {
        handleDirtyChange(true)
      }
    }
  }, [content, getBufferedContent, handleDirtyChange])

  const handleChange = useCallback(
    (newContent: string) => {
      setEditableContent(newContent)
      bufferChange(newContent)
    },
    [bufferChange]
  )

  const currentTab = state.tabs.find((t) => t.path === filePath)

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        <div className="flex flex-1 items-center justify-center text-destructive">
          {error}
        </div>
      </div>
    )
  }

  // Non-markdown files: read-only code view
  if (!isMarkdown) {
    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-muted-foreground">
          <FileIcon className="size-3.5" />
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{filePath}</code>
          <span className="text-xs">(read-only)</span>
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="p-6 font-mono text-sm">{editableContent}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <EditorTabs />
      <EditorToolbar
        filePath={filePath}
        mode={mode}
        onModeChange={setMode}
        dirty={currentTab?.dirty ?? false}
      />
      <div className="flex-1 overflow-auto">
        {mode === "source" ? (
          <SourceEditor
            content={editableContent}
            editable={true}
            onChange={handleChange}
          />
        ) : (
          <MarkdownEditor
            content={editableContent}
            editable={mode === "wysiwyg"}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 9: Add TabsProvider to the root layout

Modify `src/routes/__root.tsx` to wrap with the TabsProvider:

```tsx
// src/routes/__root.tsx
import { Outlet } from "@tanstack/react-router"
import { useReducer } from "react"
import { Sidebar } from "@/components/Sidebar"
import { TabsContext, tabsReducer } from "@/stores/tabs"

export function RootLayout() {
  const [state, dispatch] = useReducer(tabsReducer, { tabs: [], activeTab: null })

  return (
    <TabsContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </TabsContext.Provider>
  )
}
```

**Verify**: `bun run typecheck` → exit 0

### Step 10: Visual verification

Run the full stack:
1. `bun run build` to build the client
2. `bun run dev:server` to start the Hono server

Open `http://localhost:5200`:
1. Click a `.md` file in the sidebar → it opens in Read mode with rendered markdown
2. The tab appears at the top with the file name
3. Click "Edit" → WYSIWYG editing works, typing produces formatted content
4. Click "Source" → raw markdown textarea, can edit
5. Switch between modes preserves content
6. After editing, the unsaved dot appears on the tab
7. After 2-3 seconds of inactivity, the dot disappears (auto-saved)
8. Open a second `.md` file → second tab appears
9. Click a non-`.md` file → shows read-only with "(read-only)" label
10. Close a tab with the X button → tab disappears, navigates to next tab or home

**Verify**: All 10 behaviors work as described. No console errors.

## Test plan

No automated tests for v1. Verification is the visual smoke test in step 10.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun run lint` exits 0
- [ ] Opening a `.md` file shows it in Tiptap WYSIWYG (read mode by default)
- [ ] Three-state toggle works: Read / WYSIWYG Edit / Source Edit
- [ ] Editing in WYSIWYG produces markdown that's saved to disk
- [ ] Editing in Source mode produces content that's saved to disk
- [ ] Auto-save fires after ~2.5 seconds of inactivity
- [ ] Session storage buffer works (content persists across mode switches)
- [ ] Tab bar shows open files with dirty dot indicator
- [ ] Closing a tab navigates to the next tab or home
- [ ] Non-markdown files show as read-only
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back if:

- `@tiptap/markdown` does not export a `Markdown` extension — check the actual exports with `grep "export" node_modules/@tiptap/markdown/dist/index.d.ts`
- `editor.storage.markdown.getMarkdown()` does not exist or returns undefined — the API may differ in v3.27
- `editor.commands.setContent()` does not accept markdown strings when the Markdown extension is loaded — check the Tiptap docs
- The Tiptap editor renders but does not respond to the `editable` prop changes via `editor.setEditable()`

## Maintenance notes

- The `MarkdownEditor` component creates a new Tiptap editor instance on mount. If the `content` prop changes (new file loaded), it calls `setContent` which replaces the document. This can lose undo history — acceptable for file switching but worth noting.
- The `useAutoSave` hook uses `sessionStorage` keyed by `stageone:buffer:${path}`. If the file path contains special characters, the key should still work but may be ugly in devtools.
- The debounce timer (2500ms) is hardcoded. If users want it configurable, extract to a constant or CLI flag.
- The `SourceEditor` is a plain `<textarea>`. For syntax highlighting in source mode, a future plan could swap this for CodeMirror or a Shiki-highlighted editor. But plain textarea is correct for v1.
- Content sync between WYSIWYG and Source modes goes through `editableContent` state. Switching modes re-renders with the current content string — no data loss, but the Tiptap editor re-parses markdown each time you switch from source to WYSIWYG.
