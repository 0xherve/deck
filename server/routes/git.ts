import { execSync } from "node:child_process"
import { Hono } from "hono"

export function createGitRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/git-diff", (c) => {
    try {
      const patch = execSync("git diff HEAD", {
        cwd: rootDir,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      })
      return c.json({ patch })
    } catch {
      return c.json({ patch: "" })
    }
  })

  return app
}
