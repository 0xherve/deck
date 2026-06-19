import { PatchDiff } from "@pierre/diffs/react"

interface DiffViewerProps {
  patch: string
}

export function DiffViewer({ patch }: DiffViewerProps) {
  if (!patch.trim()) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Clean working directory</p>
          <p className="mt-1 text-sm">No changes detected against HEAD</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <PatchDiff
        patch={patch}
        disableWorkerPool
        options={{
          layout: "split" as const,
        }}
      />
    </div>
  )
}
