import { useParams } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { useTabs } from "@/stores/tabs"
import { useFileContent } from "@/hooks/useFileContent"
import { useFileMeta } from "@/hooks/useFileMeta"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { ImageViewer } from "@/components/ImageViewer"
import { BinaryViewer } from "@/components/BinaryViewer"
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

  const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".mdx")
  const meta = useFileMeta(filePath)
  const baseDir = filePath.includes("/") ? filePath.substring(0, filePath.lastIndexOf("/")) : ""

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      dispatch({ type: "SET_DIRTY", path: filePath, dirty })
    },
    [dispatch, filePath]
  )

  useEffect(() => {
    if (filePath) dispatch({ type: "OPEN_TAB", path: filePath })
  }, [filePath, dispatch])

  const currentTab = state.tabs.find((t) => t.path === filePath)

  if (loading || content === null) {
    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        {loading && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Loading...
          </div>
        )}
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
    if (meta?.isImage) {
      return (
        <div className="flex h-full flex-col">
          <EditorTabs />
          <ImageViewer filePath={filePath} fileSize={meta.size} />
        </div>
      )
    }

    if (meta?.isBinary) {
      return (
        <div className="flex h-full flex-col">
          <EditorTabs />
          <BinaryViewer filePath={filePath} fileSize={meta.size} ext={meta.ext} />
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        <EditorTabs />
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-muted-foreground">
          <IconFile size={14} className="text-muted-foreground/60" />
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{filePath}</code>
          <span className="text-xs">(read-only)</span>
        </div>
        <div key={filePath} className="flex-1 overflow-auto">
          <CodeViewer content={content} filePath={filePath} />
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
      <div key={filePath} className="flex-1 overflow-auto">
        {mode === "source" ? (
          <SourceEditor
            content={content}
            editable={true}
            onChange={() => {}}
          />
        ) : (
          <MarkdownEditor
            content={content}
            editable={mode === "wysiwyg"}
            filePath={filePath}
            onDirtyChange={handleDirtyChange}
            baseDir={baseDir}
          />
        )}
      </div>
    </div>
  )
}
