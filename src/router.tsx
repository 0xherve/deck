import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { HomePage } from "./routes/index"
import { FileViewRoute } from "./routes/v.$"
import { DiffViewRoute } from "./routes/d.$"
import { HistoryRoute } from "./routes/h"
import { CommitDiffRoute } from "./routes/h.$"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const fileViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/v/$",
  component: FileViewRoute,
})

const diffViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/d/$",
  component: DiffViewRoute,
})

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/h",
  component: HistoryRoute,
})

const commitDiffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/h/$",
  component: CommitDiffRoute,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  fileViewRoute,
  diffViewRoute,
  historyRoute,
  commitDiffRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
