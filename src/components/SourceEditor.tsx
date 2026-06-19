interface SourceEditorProps {
  content: string
  editable: boolean
  onChange?: (content: string) => void
}

export function SourceEditor({ content, editable, onChange }: SourceEditorProps) {
  return (
    <textarea
      value={content}
      readOnly={!editable}
      onChange={(e) => onChange?.(e.target.value)}
      className="h-full w-full resize-none bg-background p-6 font-mono text-sm text-foreground outline-none"
      spellCheck={false}
    />
  )
}
