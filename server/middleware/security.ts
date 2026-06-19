import path from "node:path"
import type { MiddlewareHandler } from "hono"

export function resolveSafePath(rootDir: string, relativePath: string): string {
  const resolved = path.resolve(rootDir, relativePath)
  if (!resolved.startsWith(rootDir + path.sep) && resolved !== rootDir) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

export const originGuard: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header("origin")
  if (
    origin &&
    !origin.includes("localhost") &&
    !origin.includes("127.0.0.1")
  ) {
    return c.text("Forbidden", 403)
  }
  await next()
}
