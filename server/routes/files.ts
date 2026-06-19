import fs from "node:fs"
import path from "node:path"
import { Hono } from "hono"
import { resolveSafePath, PathTraversalError } from "../middleware/security.ts"

interface TreeEntry {
  name: string
  path: string
  type: "file" | "directory"
  children?: TreeEntry[]
}

async function readTree(dir: string, rootDir: string): Promise<TreeEntry[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
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
        children: await readTree(fullPath, rootDir),
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

  app.get("/api/tree", async (c) => {
    const tree = await readTree(rootDir, rootDir)
    return c.json(tree)
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
