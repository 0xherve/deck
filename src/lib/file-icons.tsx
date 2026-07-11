import type { ComponentType } from "react"
import {
  IconBraces,
  IconBrandGit,
  IconFile,
  IconFileTypeCss,
  IconFileTypeHtml,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFolder,
  IconFolderOpen,
  IconLock,
  IconMarkdown,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type IconProps = { size?: number; className?: string }

function ext(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase()
}

function pickFileIcon(name: string): ComponentType<IconProps> {
  if (name === ".gitignore") return IconBrandGit
  if (name.startsWith(".prettier")) return IconBraces
  if (name.endsWith(".lock") || name.endsWith(".lockb")) return IconLock

  switch (ext(name)) {
    case "ts":
      return IconFileTypeTs
    case "tsx":
      return IconFileTypeTsx
    case "js":
      return IconFileTypeJs
    case "jsx":
      return IconFileTypeJsx
    case "json":
      return IconBraces
    case "md":
    case "mdx":
      return IconMarkdown
    case "html":
      return IconFileTypeHtml
    case "css":
      return IconFileTypeCss
    default:
      return IconFile
  }
}

const fileIconColor: Record<string, string> = {
  ts: "text-sky-400",
  tsx: "text-sky-400",
  js: "text-amber-300",
  jsx: "text-amber-300",
  json: "text-amber-200/90",
  md: "text-muted-foreground",
  mdx: "text-muted-foreground",
  html: "text-orange-400",
  css: "text-sky-300",
}

export function FileTypeIcon({
  name,
  type = "file",
  open = false,
  size = 16,
  className,
}: {
  name: string
  type?: "file" | "directory"
  open?: boolean
  size?: number
  className?: string
}) {
  if (type === "directory") {
    const Folder = open ? IconFolderOpen : IconFolder
    return <Folder size={size} className={cn("shrink-0 text-muted-foreground", className)} />
  }

  const Icon = pickFileIcon(name)
  const color = fileIconColor[ext(name)] ?? "text-muted-foreground/80"
  return <Icon size={size} className={cn("shrink-0", color, className)} />
}

export function splitFilePath(filePath: string) {
  const i = filePath.lastIndexOf("/")
  if (i === -1) return { name: filePath, dir: "" }
  return { name: filePath.slice(i + 1), dir: filePath.slice(0, i) }
}
