import { useParams } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { useTabs } from "@/stores/tabs"
import { useFileContent } from "@/hooks/useFileContent"
import { useAutoSave } from "@/hooks/useAutoSave"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { SourceEditor } from "@/components/SourceEditor"
import { EditorToolbar, type EditorMode } from "@/components/EditorToolbar"
import { EditorTabs } from "@/components/EditorTabs"
import { CodeViewer } from "@/components/CodeViewer"
import { IconFile } from "@tabler/icons-react"

export function FileViewRoute() {
  const params = useParams({ strict: false })
  const filePath = (params as Record<string, string>)._splat ?? ""
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

  useEffect(() => {
    if (filePath) {
      dispatch({ type: "OPEN_TAB", path: filePath })
    }
  }, [filePath, dispatch])

  useEffect(() => {
    if (content === null) return
    const buffered = getBufferedContent()
    Promise.resolve().then(() => {
      if (buffered !== null) {
        setEditableContent(buffered)
        if (buffered !== content) {
          handleDirtyChange(true)
        }
      } else {
        setEditableContent(content)
      }
    })
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

  if (!isMarkdown) {
    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-muted-foreground">
          <IconFile size={14} />
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{filePath}</code>
          <span className="text-xs">(read-only)</span>
        </div>
        <div className="flex-1 overflow-auto">
          <CodeViewer content={editableContent} filePath={filePath} />
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
