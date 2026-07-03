import { IconFileOff } from "@tabler/icons-react"

interface BinaryViewerProps {
  filePath: string
  fileSize: number
  ext: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BinaryViewer({ filePath, fileSize, ext }: BinaryViewerProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <IconFileOff size={32} className="mx-auto text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Binary file</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {ext.toUpperCase().slice(1)} &middot; {formatSize(fileSize)}
        </p>
        <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {filePath}
        </code>
      </div>
    </div>
  )
}
