# Plan 007: Refine UI to Vercel/OpenAI design system aesthetic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 392bc92..HEAD -- src/index.css src/components/ src/routes/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/002-client-routing.md, plans/006-code-review-fixes.md
- **Category**: direction
- **Planned at**: commit `392bc92`, 2026-06-19

## Why this matters

The user wants the app to match Vercel/OpenAI's design language: ruthlessly minimal, monochrome with subtle orange accent, sharp typography, no visual noise. The current scaffold is functional but generic. This plan applies the specific design decisions needed to achieve that aesthetic across all existing components.

## Current state

The app uses:

- **Fonts**: Geist Variable (body, `--font-sans`) + DM Sans Variable (headings, `--font-heading`). Geist is Vercel's own typeface — correct foundation.
- **Icons**: `@tabler/icons-react` (after plan 006)
- **Colors**: oklch system with orange/amber primary (`oklch(0.553 0.195 38.402)`), zinc-based neutrals. Light and dark modes.
- **Radius**: `--radius: 0.625rem` (10px) — too soft for Vercel's feel.
- **Components**: shadcn Base UI primitives (Button with cva variants)

Missing: Geist Mono for code/path/metadata text. Need to install `@fontsource-variable/geist-mono`.

Key existing files and their issues:

- `src/index.css` — radius too large, missing mono font registration
- `src/components/Sidebar.tsx` — hover states too heavy (bg fills), "FILES" uppercase label is chrome Vercel wouldn't use, transition too slow
- `src/components/FileTree.tsx` — file names should be monospace
- `src/components/ThemeToggle.tsx` — functional, needs Button component (handled in 006)
- `src/routes/index.tsx` — `text-4xl` heading is too large

## Design principles to follow

1. **No gradients, no shadows** (except active segment controls)
2. **Borders as structure** — not background fills for hover states
3. **Monospace for paths/code** — Geist Mono for file names, paths, metadata
4. **Tight typography** — headings max `text-2xl`, `tracking-tight`, `font-medium` not `font-bold`
5. **Subtle hover** — `hover:text-foreground` or `hover:bg-accent` (nearly invisible), not prominent bg fills
6. **Fast transitions** — `duration-150` everywhere, not `duration-200`
7. **Icons recede** — `text-muted-foreground` default, `text-foreground` on hover/active
8. **Orange accent is surgical** — only for: active states, dirty indicators, primary actions. Everything else is grayscale.

## Commands you will need

## Scope

**In scope**:

- `src/index.css` (modify) — reduce radius, add mono font
- `src/components/Sidebar.tsx` (modify) — restyle to Vercel aesthetic
- `src/components/FileTree.tsx` (modify) — monospace file names, subtler hover
- `src/components/ThemeToggle.tsx` (modify) — may need minor style tweaks after 006
- `src/routes/index.tsx` (modify) — tighten heading typography
- `src/routes/__root.tsx` (modify) — if layout adjustments needed

**Out of scope**:

- `src/components/ui/button.tsx` — do not modify the design system primitive
- `src/components/theme-provider.tsx` — do not modify
- Server code
- Plans 003-005 components (editor, diff viewer, code viewer — those plans will follow these conventions)

## Git workflow

- Branch: work on current branch
- Commit style: `feat: <description>`
- One commit

## Steps

### Step 1: Install Geist Mono and register it

```bash
bun add @fontsource-variable/geist-mono
```

In `src/index.css`, add the import and register the font:

```css
@import "@fontsource-variable/geist-mono";
```

In the `@theme inline` block, add:

```css
--font-mono: 'Geist Mono Variable', monospace;
```

**Verify**: `bun run typecheck` → exit 0

### Step 2: Tighten the design tokens in index.css

In `src/index.css`, change:

```css
--radius: 0.625rem;
```

to:

```css
--radius: 0.5rem;
```

This changes all derived radii (sm, md, lg, xl, etc.) proportionally. 8px base instead of 10px — crisper, more Vercel.

**Verify**: file saved, no syntax errors

### Step 3: Restyle the Sidebar

Rewrite `src/components/Sidebar.tsx` to match this aesthetic:

Key changes:

- Remove the uppercase "Files" section label — the tree speaks for itself
- Nav items: `text-muted-foreground` default, `hover:text-foreground` for hover (text brightening, not bg fill)
- Active nav item: `text-foreground font-medium` — no background
- Collapse transition: `duration-150` not `duration-200`
- Header: "stageone" in `font-mono text-xs font-medium tracking-wide uppercase text-muted-foreground` — understated, Vercel-style project name
- Border separator between nav and tree: just a `border-t`, no padding label
- Sidebar width: keep `w-64` expanded, `w-12` collapsed

Target structure:

```tsx
<aside className={cn(
  "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
  collapsed ? "w-12" : "w-64"
)}>
  {/* Header — compact, 40px height */}
  <div className="flex h-10 shrink-0 items-center justify-between px-3">
    {!collapsed && (
      <span className="font-mono text-xs font-medium tracking-wide uppercase text-muted-foreground">
        stageone
      </span>
    )}
    <Button variant="ghost" size="icon-xs" ...>
      <IconLayoutSidebar size={14} />
    </Button>
  </div>

  {!collapsed && (
    <>
      {/* Nav — minimal, no section chrome */}
      <nav className="space-y-0.5 px-2 py-1.5">
        <Link className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground">
          <IconHome size={15} className="shrink-0" />
          Home
        </Link>
        <Link className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground">
          <IconGitCompare size={15} className="shrink-0" />
          Changes
        </Link>
      </nav>

      {/* Tree — separated by border only */}
      <div className="flex-1 overflow-y-auto border-t border-sidebar-border px-2 pt-2">
        <FileTree />
      </div>
    </>
  )}

  {/* Footer */}
  {!collapsed && (
    <div className="shrink-0 border-t border-sidebar-border p-2">
      <ThemeToggle />
    </div>
  )}
</aside>
```

All icons from `@tabler/icons-react`. Use `size={15}` for nav icons (slightly smaller than 16, more refined).

**Verify**: `bun run typecheck` → exit 0

### Step 4: Restyle the FileTree

In `src/components/FileTree.tsx`:

- File names in `font-mono text-[13px]` — Geist Mono for that Vercel feel
- Directory names stay in sans (`text-[13px]` only)
- Hover: `hover:text-foreground` instead of `hover:bg-sidebar-accent` — text brightening, not bg
- Markdown files: `text-sidebar-primary` (the orange) only when hovered or active, otherwise same `text-muted-foreground` as other files. Subtle, not shouting.
- Chevron icon: `text-muted-foreground/50` default (barely visible), `text-muted-foreground` on hover
- Remove the empty `<span>` spacer element (finding from code review) — use paddingLeft adjustment for files instead

Target for file items:

```tsx
<button
  className="flex w-full items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
  style={{ paddingLeft: `${depth * 12 + 20}px` }}
>
  <IconFile size={14} className="shrink-0 text-muted-foreground/60" />
  <span className="truncate">{entry.name}</span>
</button>
```

Target for directory items:

```tsx
<button
  className="flex w-full items-center gap-1 rounded-sm px-2 py-0.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
  style={{ paddingLeft: `${depth * 12 + 8}px` }}
>
  <IconChevronRight size={12} className={cn("shrink-0 text-muted-foreground/40 transition-transform duration-150", expanded && "rotate-90")} />
  <IconFolder size={14} className="shrink-0 text-muted-foreground/60" />
  <span className="truncate">{entry.name}</span>
</button>
```

**Verify**: `bun run typecheck` → exit 0

### Step 5: Tighten the home page

In `src/routes/index.tsx`:

```tsx
export function HomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-medium tracking-tight">stageone</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a file from the sidebar to begin
        </p>
      </div>
    </div>
  )
}
```

Changes: `text-4xl font-bold` → `text-2xl font-medium`, added `font-heading` for DM Sans, `tracking-tight`, shorter copy, smaller gap.

**Verify**: `bun run typecheck` → exit 0

### Step 6: Visual verification

Run `bun run dev`. Check:

1. Sidebar has no uppercase "FILES" label — tree starts directly below nav
2. Nav items are subdued gray, brighten on hover (no bg fill)
3. File names are in monospace (Geist Mono)
4. "stageone" in header is small, monospace, uppercase, muted
5. Home page heading is `text-2xl`, not huge
6. Transitions feel snappy (150ms)
7. Dark mode: borders are subtle, no harsh lines
8. Overall feel: clean, minimal, Vercel-like restraint

**Verify**: All 8 visual checks pass. No console errors.

## Test plan

Visual only — this is a styling plan. No functional changes.

## Done criteria

- \`bun run typecheck\` exits 0
- \`@fontsource-variable/geist-mono\` installed and registered as \`--font-mono\`
- \`--radius\` reduced to \`0.5rem\`
- Sidebar restyled: no "FILES" label, text-only hover states, monospace project name
- FileTree file names in monospace, subtler hover, no empty spacer span
- Home page heading is \`text-2xl font-medium\`
- All transitions use \`duration-150\`
- No files outside the in-scope list are modified

## STOP conditions

- `@fontsource-variable/geist-mono` fails to install or the font doesn't render — check the import path
- Tailwind `font-mono` class doesn't pick up the new `--font-mono` variable — check the `@theme inline` block mapping

## Maintenance notes

- Plans 003-005 (editor, diff viewer, code viewer) should follow these conventions: font-mono for all paths/code, `text-[13px]` for compact UI text, `duration-150` for transitions, `hover:text-foreground` over `hover:bg-*` for list items.
- The orange primary should only appear for: active states, dirty indicators, primary action buttons, and markdown file indicators. Everything else is grayscale.
- Tab bar (plan 003) should use Vercel's pattern: thin bottom border, active tab gets `border-b-2 border-foreground`, no bg fills.
- Editor toolbar segmented control: `bg-muted` container, active segment `bg-background shadow-sm`.

