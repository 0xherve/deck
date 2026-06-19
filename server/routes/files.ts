import fs from "node:fs"
import path from "node:path"
import { Hono } from "hono"
import { resolveSafePath } from "../middleware/security.ts"

interface TreeEntry {
  name: string
  path: string
  type: "file" | "directory"
  children?: TreeEntry[]
}

function readTree(dir: string, rootDir: string): TreeEntry[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const result: TreeEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(rootDir, fullPath)

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: readTree(fullPath, rootDir),
      })
    } else {
      result.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      })
    }
  }

  return result.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === "directory" ? -1 : 1
  })
}

export function createFileRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/tree", (c) => {
    const tree = readTree(rootDir, rootDir)
    return c.json(tree)
  })

  app.get("/api/file", (c) => {
    const filePath = c.req.query("path")
    if (!filePath) {
      return c.text("Missing path parameter", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, filePath)
      const content = fs.readFileSync(resolved, "utf-8")
      return c.json({ path: filePath, content })
    } catch (e) {
      if (e instanceof Error && e.message === "Path traversal detected") {
        return c.text("Forbidden", 403)
      }
      return c.text("Not found", 404)
    }
  })

  app.post("/api/save", async (c) => {
    const body = await c.req.json<{ path: string; content: string }>()
    if (!body.path || body.content === undefined) {
      return c.text("Missing path or content", 400)
    }

    try {
      const resolved = resolveSafePath(rootDir, body.path)
      fs.writeFileSync(resolved, body.content, "utf-8")
      return c.json({ ok: true })
    } catch (e) {
      if (e instanceof Error && e.message === "Path traversal detected") {
        return c.text("Forbidden", 403)
      }
      return c.text("Write failed", 500)
    }
  })

  return app
}
