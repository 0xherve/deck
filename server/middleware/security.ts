import fs from "node:fs"
import path from "node:path"
import type { MiddlewareHandler } from "hono"

export class PathTraversalError extends Error {
  constructor() {
    super("Path traversal detected")
    this.name = "PathTraversalError"
  }
}

const realRootCache = new Map<string, string>()

function getRealRoot(rootDir: string): string {
  const cached = realRootCache.get(rootDir)
  if (cached) return cached
  const real = fs.realpathSync(rootDir)
  realRootCache.set(rootDir, real)
  return real
}

export function resolveSafePath(rootDir: string, relativePath: string): string {
  const realRoot = getRealRoot(rootDir)
  const resolved = path.resolve(realRoot, relativePath)

  let realResolved: string
  try {
    realResolved = fs.realpathSync(resolved)
  } catch {
    // Target may not exist yet (e.g. a new file being written); fall back to
    // realpathing the nearest existing ancestor so symlinked parent dirs are
    // still resolved before the containment check.
    realResolved = resolveExistingAncestor(resolved)
  }

  if (realResolved !== realRoot && !realResolved.startsWith(realRoot + path.sep)) {
    throw new PathTraversalError()
  }

  return resolved
}

function resolveExistingAncestor(target: string): string {
  let current = target
  const suffixParts: string[] = []

  while (true) {
    try {
      const real = fs.realpathSync(current)
      return suffixParts.length > 0 ? path.join(real, ...suffixParts.reverse()) : real
    } catch {
      const parent = path.dirname(current)
      if (parent === current) throw new PathTraversalError()
      suffixParts.push(path.basename(current))
      current = parent
    }
  }
}

export const originGuard: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header("origin")
  if (origin) {
    try {
      const url = new URL(origin)
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        return c.text("Forbidden", 403)
      }
    } catch {
      return c.text("Forbidden", 403)
    }
  }
  await next()
}
