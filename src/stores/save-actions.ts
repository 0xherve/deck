type SaveFn = () => Promise<void>

const saveRef: { current: SaveFn | null } = { current: null }

export function registerSave(fn: SaveFn) {
  saveRef.current = fn
}

export function unregisterSave() {
  saveRef.current = null
}

export async function triggerSave() {
  await saveRef.current?.()
}
