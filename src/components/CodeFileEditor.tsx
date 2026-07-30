import { useEffect, useState, useCallback, useRef } from "react"
import { SourceEditor } from "@/components/SourceEditor"
import { useAutoSave } from "@/hooks/useAutoSave"
import { useTabs } from "@/stores/tabs"
import { registerSave, unregisterSave } from "@/stores/save-actions"
import { useDiskConflict } from "@/hooks/useDiskConflict"
import { ChangedOnDiskBanner } from "@/components/ChangedOnDiskBanner"

interface CodeFileEditorProps {
  filePath: string
  content: string
  onRefetch: () => void
}

export function CodeFileEditor({ filePath, content, onRefetch }: CodeFileEditorProps) {
  const { state, dispatch } = useTabs()
  const isDirty = state.tabs.find((t) => t.path === filePath)?.dirty ?? false
  const handleDirty = useCallback(
    (dirty: boolean) => dispatch({ type: "SET_DIRTY", path: filePath, dirty }),
    [dispatch, filePath]
  )
  const { bufferChange, getBufferedContent, saveNow } = useAutoSave(filePath, handleDirty)
  const [loadedFile, setLoadedFile] = useState(filePath)
  const [loadedContent, setLoadedContent] = useState(content)
  const [value, setValue] = useState(() => getBufferedContent() ?? content)
  const valueRef = useRef(value)
  let editorValue = value

  if (loadedFile !== filePath || loadedContent !== content) {
    const nextValue = getBufferedContent() ?? content
    setLoadedFile(filePath)
    setLoadedContent(content)
    setValue(nextValue)
    editorValue = nextValue
  }

  useEffect(() => {
    valueRef.current = editorValue
  }, [editorValue])

  const { changedOnDisk, reload } = useDiskConflict(
    filePath,
    isDirty,
    onRefetch,
    useCallback(() => handleDirty(false), [handleDirty])
  )

  useEffect(() => {
    registerSave(() => saveNow(valueRef.current))
    return () => unregisterSave()
  }, [saveNow])

  return (
    <div className="flex h-full flex-col">
      {changedOnDisk && <ChangedOnDiskBanner onReload={reload} />}
      <div className="flex-1 overflow-auto">
        <SourceEditor
          content={editorValue}
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
