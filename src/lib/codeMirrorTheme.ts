import { EditorView } from "@codemirror/view"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"
import type { Extension } from "@codemirror/state"
import { tokensFor, type ResolvedTheme } from "@/lib/theme-tokens"

const cache = new Map<ResolvedTheme, Extension>()

export function codeMirrorTheme(resolvedTheme: ResolvedTheme): Extension {
  const cached = cache.get(resolvedTheme)
  if (cached) return cached

  const tokens = tokensFor(resolvedTheme)
  const { syntax } = tokens
  const isDark = resolvedTheme === "dark"

  const theme = EditorView.theme(
    {
      "&": { color: tokens.fg, backgroundColor: tokens.canvas },
      ".cm-content": { caretColor: tokens.accent },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: tokens.accent },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: `color-mix(in srgb, ${tokens.accent} 20%, transparent)` },
      ".cm-activeLine": { backgroundColor: tokens.canvasSubtle },
      ".cm-gutters": {
        backgroundColor: tokens.canvas,
        color: tokens.fgMuted,
        border: "none",
      },
      ".cm-activeLineGutter": { backgroundColor: tokens.canvasSubtle, color: tokens.fg },
    },
    { dark: isDark }
  )

  const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.operatorKeyword], color: syntax.keyword },
    { tag: [t.string, t.special(t.string), t.regexp], color: syntax.string },
    { tag: [t.comment, t.lineComment, t.blockComment], color: syntax.comment, fontStyle: "italic" },
    {
      tag: [
        t.function(t.variableName),
        t.function(t.propertyName),
        t.definition(t.function(t.variableName)),
      ],
      color: syntax.entity,
    },
    { tag: [t.number, t.bool, t.null, t.atom, t.constant(t.name)], color: syntax.constant },
    { tag: [t.className, t.typeName, t.namespace], color: syntax.variable },
    { tag: [t.tagName, t.heading], color: syntax.tag },
    { tag: [t.attributeName, t.propertyName], color: syntax.constant },
    { tag: [t.variableName, t.definition(t.variableName)], color: tokens.fg },
    { tag: [t.link, t.url], color: syntax.constant, textDecoration: "underline" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.invalid, color: tokens.danger },
  ])

  const extension: Extension = [theme, syntaxHighlighting(highlight)]
  cache.set(resolvedTheme, extension)
  return extension
}
