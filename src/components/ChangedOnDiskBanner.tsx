import { IconAlertTriangle } from "@tabler/icons-react"

export function ChangedOnDiskBanner({ onReload }: { onReload: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border bg-primary/10 px-4 py-2 text-xs text-primary">
      <div className="flex items-center gap-2">
        <IconAlertTriangle size={14} />
        <span>This file changed on disk. Your unsaved edits are kept.</span>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="rounded bg-primary/20 px-2 py-1 font-medium hover:bg-primary/30"
      >
        Reload from disk
      </button>
    </div>
  )
}
