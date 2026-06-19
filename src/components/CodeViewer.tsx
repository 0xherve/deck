import { File as FileView } from "@pierre/diffs/react"

interface CodeViewerProps {
  content: string
  filePath: string
}

export function CodeViewer({ content, filePath }: CodeViewerProps) {
  return (
    <div className="h-full overflow-auto">
      <FileView
        file={{
          name: filePath,
          contents: content,
        }}
        disableWorkerPool
      />
    </div>
  )
}
