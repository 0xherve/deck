export type RefKind = "raw-image" | "in-app-link" | "external-link" | "anchor"

export interface ResolvedRef {
  kind: RefKind
  href: string
}

function isExternal(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#")
}

function joinPath(baseDir: string, relative: string): string {
  const base = baseDir.split("/").filter(Boolean)
  const segments = relative.split("/")

  for (const segment of segments) {
    if (segment === "" || segment === ".") continue
    if (segment === "..") {
      base.pop()
      continue
    }
    base.push(segment)
  }

  return base.join("/")
}

/**
 * Resolves a markdown reference (image src or link href) relative to the
 * document's directory. Pure function, no I/O.
 *
 * - Relative images resolve to the raw-file endpoint.
 * - Relative links resolve to an in-app path for client-side navigation.
 * - External (absolute URL) links are left as-is for a new-tab open.
 * - In-page anchors (`#...`) are left as-is.
 */
export function resolveRef(ref: string, baseDir: string, isImage: boolean): ResolvedRef {
  if (ref.startsWith("#")) {
    return { kind: "anchor", href: ref }
  }

  if (isExternal(ref)) {
    return { kind: "external-link", href: ref }
  }

  const [pathPart, hash] = ref.split("#")
  const resolved = joinPath(baseDir, pathPart)

  if (isImage) {
    return { kind: "raw-image", href: `/api/raw?path=${encodeURIComponent(resolved)}` }
  }

  return { kind: "in-app-link", href: hash ? `${resolved}#${hash}` : resolved }
}
