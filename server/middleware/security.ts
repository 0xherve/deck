import path from "node:path"
import type { MiddlewareHandler } from "hono"

export class PathTraversalError extends Error {
  constructor() {
    super("Path traversal detected")
    this.name = "PathTraversalError"
  }
}

export function resolveSafePath(rootDir: string, relativePath: string): string {
  const resolved = path.resolve(rootDir, relativePath)
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    throw new PathTraversalError()
  }
  return resolved
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
