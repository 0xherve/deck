import path from "node:path"
import { fileURLToPath } from "node:url"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { originGuard } from "./middleware/security.ts"
import { createFileRoutes } from "./routes/files.ts"
import { createGitRoutes } from "./routes/git.ts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createServer(rootDir: string, port: number) {
  const app = new Hono()

  app.use("*", originGuard)

  const fileRoutes = createFileRoutes(rootDir)
  const gitRoutes = createGitRoutes(rootDir)

  app.route("/", fileRoutes)
  app.route("/", gitRoutes)

  const clientDir = path.resolve(__dirname, "../dist/client")

  app.use(
    "/*",
    serveStatic({
      root: clientDir,
      rewriteRequestPath: (p) => p,
    }),
  )

  // SPA fallback
  app.use(
    "/*",
    serveStatic({
      root: clientDir,
      rewriteRequestPath: () => "/index.html",
    }),
  )

  const server = serve({
    fetch: app.fetch,
    port,
  })

  console.log(`StageOne running at http://localhost:${port}`)
  console.log(`Serving project: ${rootDir}`)

  return server
}
