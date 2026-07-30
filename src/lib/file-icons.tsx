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

const fileIconsByExt: Record<string, ComponentType<IconProps>> = {
  ts: IconFileTypeTs,
  tsx: IconFileTypeTsx,
  js: IconFileTypeJs,
  jsx: IconFileTypeJsx,
  json: IconBraces,
  md: IconMarkdown,
  mdx: IconMarkdown,
  html: IconFileTypeHtml,
  css: IconFileTypeCss,
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

  const Icon = name === ".gitignore"
    ? IconBrandGit
    : name.startsWith(".prettier")
      ? IconBraces
      : name.endsWith(".lock") || name.endsWith(".lockb")
        ? IconLock
        : fileIconsByExt[ext(name)] ?? IconFile
  const color = fileIconColor[ext(name)] ?? "text-muted-foreground/80"
  return <Icon size={size} className={cn("shrink-0", color, className)} />
}
