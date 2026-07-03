import { useState } from "react"
import { IconPhoto } from "@tabler/icons-react"

interface ImageViewerProps {
  filePath: string
  fileSize: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageViewer({ filePath, fileSize }: ImageViewerProps) {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null)
  const src = `/api/raw?path=${encodeURIComponent(filePath)}`

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-muted-foreground">
        <IconPhoto size={14} className="text-muted-foreground/60" />
        <span className="font-mono text-xs">{formatSize(fileSize)}</span>
        {dimensions && (
          <span className="font-mono text-xs">{dimensions.w} &times; {dimensions.h}</span>
        )}
      </div>
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-8"
        style={{
          backgroundImage: "linear-gradient(45deg, var(--color-muted) 25%, transparent 25%), linear-gradient(-45deg, var(--color-muted) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-muted) 75%), linear-gradient(-45deg, transparent 75%, var(--color-muted) 75%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      >
        <img
          src={src}
          alt={filePath}
          className="max-h-full max-w-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget
            setDimensions({ w: img.naturalWidth, h: img.naturalHeight })
          }}
        />
      </div>
    </div>
  )
}
