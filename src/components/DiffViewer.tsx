import { useState } from "react"
import { PatchDiff } from "@pierre/diffs/react"
import { IconLayoutColumns, IconLayoutRows } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

interface DiffViewerProps {
  patch: string
}

export function DiffViewer({ patch }: DiffViewerProps) {
  const [diffStyle, setDiffStyle] = useState<"unified" | "split">("unified")
  const { resolvedTheme } = useTheme()

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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-border px-2 py-1.5">
        <Button
          variant={diffStyle === "unified" ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setDiffStyle("unified")}
        >
          <IconLayoutRows size={14} /> Unified
        </Button>
        <Button
          variant={diffStyle === "split" ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5"
          onClick={() => setDiffStyle("split")}
        >
          <IconLayoutColumns size={14} /> Side-by-side
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <PatchDiff
          patch={patch}
          disableWorkerPool
          options={{
            diffStyle,
            theme: { dark: "github-dark", light: "github-light" },
            themeType: resolvedTheme,
          }}
        />
      </div>
    </div>
  )
}
