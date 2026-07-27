import { useParams, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback, useRef } from "react"
import { useTabs } from "@/stores/tabs"
import { useResource } from "@/hooks/useResource"
import { useAutoSave } from "@/hooks/useAutoSave"
import { useDiskConflict } from "@/hooks/useDiskConflict"
import { MarkdownViewer } from "@/components/markdown/MarkdownViewer"
import { ImageViewer } from "@/components/ImageViewer"
import { BinaryViewer } from "@/components/BinaryViewer"
import { SourceEditor } from "@/components/SourceEditor"
import { CodeFileEditor } from "@/components/CodeFileEditor"
import { EditorToolbar, type EditorMode } from "@/components/EditorToolbar"
import { EditorTabs } from "@/components/EditorTabs"
import { registerSave, unregisterSave } from "@/stores/save-actions"
import { toggleCheckbox } from "@/lib/toggleCheckbox"
import { saveFile } from "@/lib/file-buffer"
import { ChangedOnDiskBanner } from "@/components/ChangedOnDiskBanner"
import { IconFile } from "@tabler/icons-react"

interface FileMeta {
  size: number
  isImage: boolean
  isBinary: boolean
  ext: string
}

export function FileViewRoute() {
  const params = useParams({ strict: false })
  const filePath = (params as Record<string, string>)._splat ?? ""
  const { state, dispatch } = useTabs()
  const { data: content, loading, error, refetch } = useResource<string>(
    filePath ? `/api/file?path=${encodeURIComponent(filePath)}` : null,
    { loadingDelayMs: 150 }
  )
  const [mode, setMode] = useState<EditorMode>("read")
  const navigate = useNavigate()

  const isMarkdown = filePath.endsWith(".md") || filePath.endsWith(".mdx")
  const { data: meta } = useResource<FileMeta>(
    filePath ? `/api/file-meta?path=${encodeURIComponent(filePath)}` : null,
    { as: "json" }
  )
  const baseDir = filePath.includes("/") ? filePath.substring(0, filePath.lastIndexOf("/")) : ""

  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      dispatch({ type: "SET_DIRTY", path: filePath, dirty })
    },
    [dispatch, filePath]
  )

  const { bufferChange, getBufferedContent, saveNow } = useAutoSave(
    isMarkdown && mode === "source" ? filePath : null,
    handleDirtyChange
  )
  const [sourceValue, setSourceValue] = useState("")

  useEffect(() => {
    if (content !== null) {
      setSourceValue(getBufferedContent() ?? content)
    }
  }, [filePath, content, getBufferedContent])

  const sourceValueRef = useRef(sourceValue)

  useEffect(() => {
    sourceValueRef.current = sourceValue
  }, [sourceValue])

  useEffect(() => {
    if (isMarkdown && mode === "source") {
      registerSave(() => saveNow(sourceValueRef.current))
      return () => unregisterSave()
    }
  }, [isMarkdown, mode, saveNow])

  useEffect(() => {
    if (filePath) dispatch({ type: "OPEN_TAB", path: filePath })
  }, [filePath, dispatch])

  const currentTab = state.tabs.find((t) => t.path === filePath)

  const { changedOnDisk, reload } = useDiskConflict(
    isMarkdown ? filePath : null,
    currentTab?.dirty ?? false,
    refetch,
    useCallback(() => handleDirtyChange(false), [handleDirtyChange])
  )

  const handleNavigate = useCallback(
    (path: string) => navigate({ to: "/v/$", params: { _splat: path } }),
    [navigate]
  )

  const handleToggleTask = useCallback(
    async (index: number) => {
      if (content === null) return
      const next = toggleCheckbox(content, index)
      if (next === content) return
      await saveFile(filePath, next)
      refetch()
    },
    [content, filePath, refetch]
  )

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
          {currentTab?.dirty && (
            <span className="text-xs text-primary">unsaved</span>
          )}
        </div>
        <div key={filePath} className="flex-1 overflow-auto">
          <CodeFileEditor filePath={filePath} content={content} onRefetch={refetch} />
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
      {changedOnDisk && <ChangedOnDiskBanner onReload={reload} />}
      <div key={filePath} className="flex-1 overflow-auto">
        {mode === "source" ? (
          <SourceEditor
            content={sourceValue}
            editable={true}
            filePath={filePath}
            onChange={(next) => {
              setSourceValue(next)
              bufferChange(next)
            }}
          />
        ) : (
          <MarkdownViewer
            source={content}
            baseDir={baseDir}
            navigate={handleNavigate}
            onToggleTask={handleToggleTask}
          />
        )}
      </div>
    </div>
  )
}
