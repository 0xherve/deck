import { Button } from "@/components/ui/button"
import { IconEye, IconCode } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type EditorMode = "read" | "source"

interface EditorToolbarProps {
  filePath: string
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  dirty: boolean
}

export function EditorToolbar({ filePath, mode, onModeChange, dirty }: EditorToolbarProps) {
  const modes: { value: EditorMode; label: string; icon: React.ReactNode }[] = [
    { value: "read", label: "Read", icon: <IconEye size={14} /> },
    { value: "source", label: "Source", icon: <IconCode size={14} /> },
  ]

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{filePath}</code>
        {dirty && (
          <span className="text-xs text-primary">Unsaved</span>
        )}
      </div>
      <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
        {modes.map((m) => (
          <Button
            key={m.value}
            variant="ghost"
            size="xs"
            className={cn(
              "gap-1 rounded-sm hover:!bg-background",
              mode === m.value && "bg-background hover:bg-background"
            )}
            onClick={() => onModeChange(m.value)}
          >
            {m.icon}
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
