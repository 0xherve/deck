import fs from "node:fs"
import path from "node:path"
import { Hono } from "hono"
import { resolveSafePath, PathTraversalError } from "../middleware/security.ts"
import { getFileTypeInfo } from "../file-types.ts"

interface TreeEntry {
  name: string
  path: string
  type: "file" | "directory"
}

async function readDir(dir: string, rootDir: string): Promise<TreeEntry[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const result: TreeEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(rootDir, fullPath)

    result.push({
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? "directory" : "file",
    })
  }

  return result.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === "directory" ? -1 : 1
  })
}

export function createFileRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/tree", async (c) => {
    const dirPath = c.req.query("path") ?? ""

    try {
      const resolved = dirPath ? resolveSafePath(rootDir, dirPath) : rootDir
      const entries = await readDir(resolved, rootDir)
      return c.json(entries)
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return c.text("Forbidden", 403)
      }
      return c.text("Not found", 404)
    }
  })

  app.get("/api/file", async (c) => {
    const filePath = c.req.query("path")
    if (!filePath) {
      return c.text("Missing path parameter", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, filePath)
      const content = await fs.promises.readFile(resolved, "utf-8")
      return c.text(content)
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return c.text("Forbidden", 403)
      }
      return c.text("Not found", 404)
    }
  })

  app.get("/api/raw", async (c) => {
    const filePath = c.req.query("path")
    if (!filePath) {
      return c.text("Missing path parameter", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, filePath)
      const stat = await fs.promises.stat(resolved)
      const buffer = await fs.promises.readFile(resolved)

      const ext = path.extname(resolved).toLowerCase()
      const { mime } = getFileTypeInfo(ext)

      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Content-Length": stat.size.toString(),
        },
      })
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return c.text("Forbidden", 403)
      }
      return c.text("Not found", 404)
    }
  })

  app.get("/api/file-meta", async (c) => {
    const filePath = c.req.query("path")
    if (!filePath) {
      return c.text("Missing path parameter", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, filePath)
      const stat = await fs.promises.stat(resolved)
      const ext = path.extname(resolved).toLowerCase()
      const { isImage, isBinary } = getFileTypeInfo(ext)

      return c.json({
        size: stat.size,
        isImage,
        isBinary,
        ext,
      })
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return c.text("Forbidden", 403)
      }
      return c.text("Not found", 404)
    }
  })

  app.get("/api/watch", (c) => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        const pending = new Map<string, ReturnType<typeof setTimeout>>()
        let closed = false

        const send = (event: string, filename: string) => {
          if (closed) return
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ event, path: filename })}\n\n`)
            )
          } catch {
            // stream already closed/errored; cleanup happens via abort listener
          }
        }

        const watcher = fs.watch(rootDir, { recursive: true }, (event, filename) => {
          if (!filename) return
          const normalized = filename.split(path.sep).join("/")
          if (normalized.startsWith(".git") || normalized.includes("node_modules")) return

          const existing = pending.get(normalized)
          if (existing) clearTimeout(existing)
          pending.set(
            normalized,
            setTimeout(() => {
              pending.delete(normalized)
              send(event, normalized)
            }, 100)
          )
        })

        const cleanup = () => {
          if (closed) return
          closed = true
          watcher.close()
          for (const timer of pending.values()) clearTimeout(timer)
          pending.clear()
          try {
            controller.close()
          } catch {
            // already closed
          }
        }

        c.req.raw.signal.addEventListener("abort", cleanup)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  })

  app.post("/api/save", async (c) => {
    const body = await c.req.json<{ path: string; content: string }>()
    if (!body.path || body.content === undefined) {
      return c.text("Missing path or content", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, body.path)
      await fs.promises.writeFile(resolved, body.content, "utf-8")
      return c.json({ ok: true })
    } catch (e) {
      if (e instanceof PathTraversalError) {
        return c.text("Forbidden", 403)
      }
      return c.text("Write failed", 500)
    }
  })

  return app
}
