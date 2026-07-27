import type { LanguageSupport } from "@codemirror/language"

async function loadLanguage(ext: string): Promise<LanguageSupport | null> {
  switch (ext) {
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs": {
      const { javascript } = await import("@codemirror/lang-javascript")
      return javascript({ jsx: ext === ".jsx" })
    }
    case ".ts": {
      const { javascript } = await import("@codemirror/lang-javascript")
      return javascript({ typescript: true })
    }
    case ".tsx": {
      const { javascript } = await import("@codemirror/lang-javascript")
      return javascript({ typescript: true, jsx: true })
    }
    case ".md":
    case ".mdx": {
      const { markdown } = await import("@codemirror/lang-markdown")
      return markdown()
    }
    case ".json":
    case ".jsonc": {
      const { json } = await import("@codemirror/lang-json")
      return json()
    }
    case ".css":
    case ".scss":
    case ".less": {
      const { css } = await import("@codemirror/lang-css")
      return css()
    }
    case ".html":
    case ".htm": {
      const { html } = await import("@codemirror/lang-html")
      return html()
    }
    case ".py": {
      const { python } = await import("@codemirror/lang-python")
      return python()
    }
    case ".yml":
    case ".yaml": {
      const { yaml } = await import("@codemirror/lang-yaml")
      return yaml()
    }
    case ".sql": {
      const { sql } = await import("@codemirror/lang-sql")
      return sql()
    }
    default:
      return null
  }
}

export function extOf(filePath: string): string {
  const idx = filePath.lastIndexOf(".")
  return idx === -1 ? "" : filePath.slice(idx).toLowerCase()
}

export { loadLanguage }
