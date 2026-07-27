import { useEffect, useState, useCallback } from "react"
import { SourceEditor } from "@/components/SourceEditor"
import { useAutoSave } from "@/hooks/useAutoSave"
import { useTabs } from "@/stores/tabs"
import { registerSave, unregisterSave } from "@/stores/save-actions"
import { useWatch } from "@/hooks/useWatch"
import { IconAlertTriangle } from "@tabler/icons-react"

interface CodeFileEditorProps {
  filePath: string
  content: string
  onRefetch: () => void
}

export function CodeFileEditor({ filePath, content, onRefetch }: CodeFileEditorProps) {
  const { state, dispatch } = useTabs()
  const dirty = state.tabs.find((t) => t.path === filePath)?.dirty ?? false
  const handleDirty = useCallback(
    (d: boolean) => dispatch({ type: "SET_DIRTY", path: filePath, dirty: d }),
    [dispatch, filePath]
  )
  const { bufferChange, getBufferedContent, saveNow } = useAutoSave(filePath, handleDirty)
  const [value, setValue] = useState(() => getBufferedContent() ?? content)
  const [changedOnDisk, setChangedOnDisk] = useState(false)

  useEffect(() => {
    setValue(getBufferedContent() ?? content)
    setChangedOnDisk(false)
  }, [filePath, content, getBufferedContent])

  useWatch(
    useCallback(
      (e) => {
        if (e.path !== filePath) return
        if (dirty) {
          setChangedOnDisk(true)
        } else {
          setChangedOnDisk(false)
          onRefetch()
        }
      },
      [filePath, dirty, onRefetch]
    )
  )

  useEffect(() => {
    registerSave(() => saveNow(value))
    return () => unregisterSave()
  }, [saveNow, value])

  const handleReloadFromDisk = useCallback(() => {
    setChangedOnDisk(false)
    sessionStorage.removeItem(`deck:buffer:${filePath}`)
    handleDirty(false)
    onRefetch()
  }, [filePath, handleDirty, onRefetch])

  return (
    <div className="flex h-full flex-col">
      {changedOnDisk && (
        <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-4 py-2 text-xs text-primary">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={14} />
            <span>This file changed on disk. Your unsaved edits are kept.</span>
          </div>
          <button
            type="button"
            onClick={handleReloadFromDisk}
            className="rounded bg-primary/20 px-2 py-1 font-medium hover:bg-primary/30"
          >
            Reload from disk
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <SourceEditor
          content={value}
          editable
          filePath={filePath}
          onChange={(next) => {
            setValue(next)
            bufferChange(next)
          }}
        />
      </div>
    </div>
  )
}
