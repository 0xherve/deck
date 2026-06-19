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
        const md = editor.storage.markdown.manager.serialize(editor.getJSON())
        onChange(md)
      }
    },
  })

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = editor.storage.markdown.manager.serialize(editor.getJSON())
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
