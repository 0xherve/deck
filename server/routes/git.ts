import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { Hono } from "hono"

const execFileAsync = promisify(execFile)
const MAX_BUFFER = 10 * 1024 * 1024

function assertSafePaths(paths: string[]) {
  for (const p of paths) {
    if (p.includes("..")) {
      throw new Error(`Invalid path: ${p}`)
    }
  }
}

export function createGitRoutes(rootDir: string) {
  const app = new Hono()

  app.get("/api/git-diff", async (c) => {
    const filePath = c.req.query("path")
    if (filePath?.includes("..")) {
      return c.json({ error: "Invalid path" }, 400)
    }

    try {
      const args = filePath ? ["diff", "HEAD", "--", filePath] : ["diff", "HEAD"]
      const { stdout } = await execFileAsync("git", args, {
        cwd: rootDir,
        maxBuffer: MAX_BUFFER,
      })
      return c.json({ patch: stdout })
    } catch {
      return c.json({ patch: "" })
    }
  })

  app.get("/api/git-status", async (c) => {
    try {
      const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
        cwd: rootDir,
        maxBuffer: MAX_BUFFER,
      })
      const files = stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const stagedCode = line[0]
          const workingCode = line[1]
          const filePath = line.slice(3)
          const staged = stagedCode !== " " && stagedCode !== "?"

          const status = stagedCode === "?" && workingCode === "?"
            ? "U"
            : stagedCode === "A" || workingCode === "A"
              ? "A"
              : stagedCode === "D" || workingCode === "D"
                ? "D"
                : "M"

          return { path: filePath, status, staged }
        })
      return c.json(files)
    } catch {
      return c.json([])
    }
  })

  app.post("/api/git-stage", async (c) => {
    const body = await c.req.json<{ paths: string[] }>()
    if (!body.paths?.length) {
      return c.json({ error: "Missing paths" }, 400)
    }

    try {
      assertSafePaths(body.paths)
      await execFileAsync("git", ["add", "--", ...body.paths], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      return c.json({ ok: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Stage failed" }, 500)
    }
  })

  app.post("/api/git-unstage", async (c) => {
    const body = await c.req.json<{ paths: string[] }>()
    if (!body.paths?.length) {
      return c.json({ error: "Missing paths" }, 400)
    }

    try {
      assertSafePaths(body.paths)
      await execFileAsync("git", ["reset", "HEAD", "--", ...body.paths], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      return c.json({ ok: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Unstage failed" }, 500)
    }
  })

  app.post("/api/git-commit", async (c) => {
    const body = await c.req.json<{ message: string }>()
    if (!body.message) {
      return c.json({ error: "Missing message" }, 400)
    }

    try {
      await execFileAsync("git", ["commit", "-m", body.message], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], {
        cwd: rootDir,
        maxBuffer: MAX_BUFFER,
      })
      return c.json({ ok: true, hash: stdout.trim() })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Commit failed" }, 500)
    }
  })

  app.post("/api/git-push", async (c) => {
    try {
      await execFileAsync("git", ["push"], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      return c.json({ ok: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Push failed" }, 500)
    }
  })

  app.post("/api/git-pull", async (c) => {
    try {
      await execFileAsync("git", ["pull"], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      return c.json({ ok: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Pull failed" }, 500)
    }
  })

  app.get("/api/git-branch", async (c) => {
    try {
      const { stdout } = await execFileAsync("git", ["branch", "--show-current"], {
        cwd: rootDir,
        maxBuffer: MAX_BUFFER,
      })
      return c.json({ branch: stdout.trim() })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Branch failed" }, 500)
    }
  })

  app.post("/api/git-stash", async (c) => {
    const body = await c.req.json<{ action: "push" | "pop" }>()
    if (body.action !== "push" && body.action !== "pop") {
      return c.json({ error: "Invalid action" }, 400)
    }

    try {
      await execFileAsync("git", ["stash", body.action], { cwd: rootDir, maxBuffer: MAX_BUFFER })
      return c.json({ ok: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Stash failed" }, 500)
    }
  })

  return app
}
