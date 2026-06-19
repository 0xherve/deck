import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router"
import { RootLayout } from "./routes/__root"
import { HomePage } from "./routes/index"
import { FileViewRoute } from "./routes/v.$"
import { DiffViewRoute } from "./routes/d.$"

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

const routeTree = rootRoute.addChildren([
  indexRoute,
  fileViewRoute,
  diffViewRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
