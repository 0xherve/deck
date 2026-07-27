/**
 * Reads deck's palette from the CSS custom properties defined in index.css.
 *
 * index.css is the single source of truth for color. Anything that cannot be
 * styled by a stylesheet — the CodeMirror theme, shiki, @pierre/* components —
 * resolves its colors through here instead of restating hex values.
 */

export type ResolvedTheme = "light" | "dark"

export interface ThemeTokens {
  canvas: string
  canvasSubtle: string
  surface: string
  border: string
  fg: string
  fgMuted: string
  accent: string
  danger: string
  syntax: {
    keyword: string
    string: string
    comment: string
    entity: string
    constant: string
    variable: string
    tag: string
  }
  /** Theme name understood by shiki and @pierre/* components. */
  shikiTheme: "github-light" | "github-dark"
}

const VAR_NAMES = {
  canvas: "--background",
  canvasSubtle: "--muted",
  surface: "--secondary",
  border: "--border",
  fg: "--foreground",
  fgMuted: "--muted-foreground",
  accent: "--primary",
  danger: "--destructive",
} as const

const SYNTAX_VAR_NAMES = {
  keyword: "--syntax-keyword",
  string: "--syntax-string",
  comment: "--syntax-comment",
  entity: "--syntax-entity",
  constant: "--syntax-constant",
  variable: "--syntax-variable",
  tag: "--syntax-tag",
} as const

function readVars(theme: ResolvedTheme): ThemeTokens {
  // Resolve against a detached element carrying the target theme's class so
  // both palettes are readable regardless of which one is currently applied.
  const probe = document.createElement("div")
  probe.className = theme === "dark" ? "dark" : ""
  probe.style.display = "none"
  document.body.appendChild(probe)
  const styles = getComputedStyle(probe)
  const read = (name: string) => styles.getPropertyValue(name).trim()

  const tokens: ThemeTokens = {
    ...(Object.fromEntries(
      Object.entries(VAR_NAMES).map(([key, name]) => [key, read(name)])
    ) as Omit<ThemeTokens, "syntax" | "shikiTheme">),
    syntax: Object.fromEntries(
      Object.entries(SYNTAX_VAR_NAMES).map(([key, name]) => [key, read(name)])
    ) as ThemeTokens["syntax"],
    shikiTheme: theme === "dark" ? "github-dark" : "github-light",
  }

  probe.remove()
  return tokens
}

const cache = new Map<ResolvedTheme, ThemeTokens>()

export function tokensFor(theme: ResolvedTheme): ThemeTokens {
  const cached = cache.get(theme)
  if (cached) return cached

  const tokens = readVars(theme)
  cache.set(theme, tokens)
  return tokens
}
