import { exec } from "node:child_process"
import { promisify } from "node:util"
import { Hono } from "hono"

const execAsync = promisify(exec)

export function createGitRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/git-diff", async (c) => {
    try {
      const { stdout } = await execAsync("git diff HEAD", {
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024,
      })
      return c.json({ patch: stdout })
    } catch {
      return c.json({ patch: "" })
    }
  })

  app.get("/api/git-status", async (c) => {
    try {
      const { stdout } = await execAsync("git status --porcelain", {
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024,
      })
      const files = stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const code = line.slice(0, 2).trim()
          const filePath = line.slice(3)
          const status = code.includes("?")
            ? "U"
            : code.includes("A")
              ? "A"
              : code.includes("D")
                ? "D"
                : "M"
          return { path: filePath, status }
        })
      return c.json(files)
    } catch {
      return c.json([])
    }
  })

  return app
}
