import { useEffect, useRef } from "react"
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { searchKeymap } from "@codemirror/search"
import { codeMirrorTheme } from "@/lib/codeMirrorTheme"
import { extOf, loadLanguage } from "@/lib/codeMirrorLanguage"
import { useTheme } from "@/components/theme-provider"

interface SourceEditorProps {
  content: string
  editable: boolean
  onChange?: (content: string) => void
  filePath?: string
}

const baseTheme = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "0.875rem" },
  ".cm-content": { padding: "1.5rem" },
  "&.cm-editor.cm-focused": { outline: "none" },
})

export function SourceEditor({ content, editable, onChange, filePath }: SourceEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const languageCompartment = useRef(new Compartment())
  const editableCompartment = useRef(new Compartment())
  const themeCompartment = useRef(new Compartment())
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (!hostRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          themeCompartment.current.of(codeMirrorTheme(resolvedTheme)),
          baseTheme,
          languageCompartment.current.of([]),
          editableCompartment.current.of(EditorView.editable.of(editable)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString())
            }
          }),
        ],
      }),
      parent: hostRef.current,
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(codeMirrorTheme(resolvedTheme)),
    })
  }, [resolvedTheme])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      })
    }
  }, [content])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(editable)),
    })
  }, [editable])

  useEffect(() => {
    let cancelled = false
    const ext = filePath ? extOf(filePath) : ""
    loadLanguage(ext).then((support) => {
      if (cancelled || !viewRef.current) return
      viewRef.current.dispatch({
        effects: languageCompartment.current.reconfigure(support ? [support] : []),
      })
    })
    return () => {
      cancelled = true
    }
  }, [filePath])

  return <div ref={hostRef} className="h-full w-full overflow-auto bg-background text-foreground" />
}
