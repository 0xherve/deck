export function bufferKey(filePath: string): string {
  return `deck:buffer:${filePath}`
}

export function readBuffer(filePath: string): string | null {
  return sessionStorage.getItem(bufferKey(filePath))
}

export function writeBuffer(filePath: string, content: string) {
  sessionStorage.setItem(bufferKey(filePath), content)
}

export function discardBuffer(filePath: string) {
  sessionStorage.removeItem(bufferKey(filePath))
}

export async function saveFile(filePath: string, content: string): Promise<void> {
  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content }),
  })
  if (!res.ok) throw new Error(await res.text())
  discardBuffer(filePath)
}
