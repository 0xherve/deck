import { Button } from "@/components/ui/button"
import { IconEye, IconPencil, IconCode } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type EditorMode = "read" | "wysiwyg" | "source"

interface EditorToolbarProps {
  filePath: string
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  dirty: boolean
}

export function EditorToolbar({ filePath, mode, onModeChange, dirty }: EditorToolbarProps) {
  const modes: { value: EditorMode; label: string; icon: React.ReactNode }[] = [
    { value: "read", label: "Read", icon: <IconEye size={14} /> },
    { value: "wysiwyg", label: "Edit", icon: <IconPencil size={14} /> },
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
      <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
        {modes.map((m) => (
          <Button
            key={m.value}
            variant="ghost"
            size="xs"
            className={cn(
              "gap-1",
              mode === m.value && "bg-background shadow-sm"
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
