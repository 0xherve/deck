export function splitFilePath(filePath: string) {
  const i = filePath.lastIndexOf("/")
  if (i === -1) return { name: filePath, dir: "" }
  return { name: filePath.slice(i + 1), dir: filePath.slice(0, i) }
}
