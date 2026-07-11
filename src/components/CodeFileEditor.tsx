import { useEffect, useState, useCallback } from "react"
import { SourceEditor } from "@/components/SourceEditor"
import { useAutoSave } from "@/hooks/useAutoSave"
import { useTabs } from "@/stores/tabs"
import { registerSave, unregisterSave } from "@/stores/save-actions"

interface CodeFileEditorProps {
  filePath: string
  content: string
}

export function CodeFileEditor({ filePath, content }: CodeFileEditorProps) {
  const { dispatch } = useTabs()
  const handleDirty = useCallback(
    (dirty: boolean) => dispatch({ type: "SET_DIRTY", path: filePath, dirty }),
    [dispatch, filePath]
  )
  const { bufferChange, getBufferedContent, saveNow } = useAutoSave(filePath, handleDirty)
  const [value, setValue] = useState(() => getBufferedContent() ?? content)

  useEffect(() => {
    setValue(getBufferedContent() ?? content)
  }, [filePath, content, getBufferedContent])

  useEffect(() => {
    registerSave(() => saveNow(value))
    return () => unregisterSave()
  }, [saveNow, value])

  return (
    <SourceEditor
      content={value}
      editable
      onChange={(next) => {
        setValue(next)
        bufferChange(next)
      }}
    />
  )
}
