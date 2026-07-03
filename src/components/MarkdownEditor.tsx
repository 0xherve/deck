import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import { useEffect, useCallback, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"

interface MarkdownEditorProps {
  content: string
  editable: boolean
  filePath: string
  onDirtyChange?: (dirty: boolean) => void
  baseDir?: string
}

const AUTOSAVE_MS = 5000

export function MarkdownEditor({ content, editable, filePath, onDirtyChange, baseDir = "" }: MarkdownEditorProps) {
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedContentRef = useRef(content)

  const save = useCallback(
    async (md: string) => {
      try {
        await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content: md }),
        })
        savedContentRef.current = md
        onDirtyChange?.(false)
      } catch (e) {
        console.error("Auto-save failed:", e)
      }
    },
    [filePath, onDirtyChange]
  )

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    editable,
    content,
    contentType: "markdown",
    onUpdate: ({ editor }) => {
      if (!editable) return
      onDirtyChange?.(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => save(editor.getMarkdown()), AUTOSAVE_MS)
    },
  })

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  // ponytail: flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!editor) return
    editor.view.dom.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src")
      if (src && !src.startsWith("http") && !src.startsWith("/api/")) {
        const resolved = baseDir ? `${baseDir}/${src}` : src
        img.setAttribute("src", `/api/raw?path=${encodeURIComponent(resolved)}`)
      }
    })
  }, [editor, baseDir])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editable) return
      const link = (e.target as HTMLElement).closest("a")
      if (!link) return
      e.preventDefault()
      const href = link.getAttribute("href")
      if (!href) return

      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.open(href, "_blank", "noopener,noreferrer")
      } else if (!href.startsWith("#")) {
        const resolved = baseDir ? `${baseDir}/${href}` : href
        navigate({ to: "/v/$", params: { _splat: resolved } })
      }
    },
    [editable, baseDir]
  )

  if (!editor) return null

  return (
    <div onClick={handleClick} className="min-w-0">
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert mx-auto max-w-[80vw] [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:px-8 [&_.ProseMirror]:py-6"
      />
    </div>
  )
}
