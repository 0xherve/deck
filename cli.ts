#!/usr/bin/env node

import path from "node:path"
import { Command } from "commander"
import open from "open"
import { createServer } from "./server/index.ts"

const program = new Command()

program
  .name("stageone")
  .description("Launch StageOne for a project directory")
  .argument("[directory]", "Directory to serve", ".")
  .option("-p, --port <number>", "Port number", "5200")
  .action(async (directory: string, options: { port: string }) => {
    const rootDir = path.resolve(directory)
    const port = parseInt(options.port, 10)

    createServer(rootDir, port)

    await open(`http://localhost:${port}`)
  })

program.parse()
