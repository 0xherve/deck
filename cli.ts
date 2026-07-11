#!/usr/bin/env node

import path from "node:path"
import { Command } from "commander"
import open from "open"
import { createServer } from "./server/index.ts"
import {
  allocatePort,
  findByRootDir,
  isPortBindable,
  listInstances,
  removeInstance,
  stopAll,
  stopInstance,
  writeInstance,
} from "./cli/instances.ts"

const program = new Command()

program.name("deck").description("Launch Deck for a project directory")

program
  .command("list")
  .description("List running Deck instances")
  .action(() => {
    const instances = listInstances()
    if (instances.length === 0) {
      console.log("No running instances")
      return
    }
    for (const inst of instances) {
      console.log(`${inst.port}\t${inst.rootDir}\t${inst.url}`)
    }
  })

program
  .command("stop")
  .description("Stop a Deck instance")
  .argument("[target]", "Port number or 'all'")
  .action((target?: string) => {
    if (!target) {
      console.error("Usage: deck stop <port|all>")
      process.exit(1)
    }
    if (target === "all") {
      const n = stopAll()
      console.log(`Stopped ${n} instance(s)`)
      return
    }
    const port = parseInt(target, 10)
    if (Number.isNaN(port)) {
      console.error("Invalid port")
      process.exit(1)
    }
    if (stopInstance(port)) {
      console.log(`Stopped instance on port ${port}`)
    } else {
      console.error(`No instance on port ${port}`)
      process.exit(1)
    }
  })

program
  .argument("[directory]", "Directory to serve", ".")
  .option("-p, --port <number>", "Port number (default: next free from 5200)")
  .action(async (directory: string, options: { port?: string }) => {
    const rootDir = path.resolve(directory)
    const existing = findByRootDir(rootDir)
    if (existing) {
      console.log(`Reopening ${existing.url}`)
      await open(existing.url)
      return
    }

    const port = options.port ? parseInt(options.port, 10) : await allocatePort(5200)
    if (Number.isNaN(port)) {
      console.error("Invalid port")
      process.exit(1)
    }

    if (!(await isPortBindable(port))) {
      console.error(`Port ${port} is already in use`)
      process.exit(1)
    }

    let server: { close: () => void } | undefined

    const cleanup = () => {
      removeInstance(port)
      server?.close()
    }

    process.on("SIGINT", () => {
      cleanup()
      process.exit(0)
    })
    process.on("SIGTERM", () => {
      cleanup()
      process.exit(0)
    })

    try {
      server = await createServer(rootDir, port)
      writeInstance({
        port,
        rootDir,
        pid: process.pid,
        startedAt: new Date().toISOString(),
        url: `http://localhost:${port}`,
      })
      await open(`http://localhost:${port}`)
    } catch (e) {
      cleanup()
      console.error(e instanceof Error ? e.message : e)
      process.exit(1)
    }
  })

program.parse()
