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

  return app
}
