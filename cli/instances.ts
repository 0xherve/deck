import fs from "node:fs"
import net from "node:net"
import path from "node:path"

export interface DeckInstance {
  port: number
  rootDir: string
  pid: number
  startedAt: string
  url: string
}

const INSTANCES_DIR = "/tmp/deck/instances"

function instancePath(port: number) {
  return path.join(INSTANCES_DIR, `${port}.json`)
}

function ensureDir() {
  fs.mkdirSync(INSTANCES_DIR, { recursive: true })
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function pruneDead(): void {
  ensureDir()
  for (const file of fs.readdirSync(INSTANCES_DIR)) {
    if (!file.endsWith(".json")) continue
    const full = path.join(INSTANCES_DIR, file)
    try {
      const inst = JSON.parse(fs.readFileSync(full, "utf-8")) as DeckInstance
      if (!isAlive(inst.pid)) {
        fs.unlinkSync(full)
      }
    } catch {
      fs.unlinkSync(full)
    }
  }
}

export function listInstances(): DeckInstance[] {
  pruneDead()
  ensureDir()
  const instances: DeckInstance[] = []
  for (const file of fs.readdirSync(INSTANCES_DIR)) {
    if (!file.endsWith(".json")) continue
    try {
      instances.push(
        JSON.parse(fs.readFileSync(path.join(INSTANCES_DIR, file), "utf-8")) as DeckInstance
      )
    } catch {
      // skip corrupt files
    }
  }
  return instances.sort((a, b) => a.port - b.port)
}

export function findByRootDir(rootDir: string): DeckInstance | null {
  pruneDead()
  const abs = path.resolve(rootDir)
  return listInstances().find((i) => i.rootDir === abs) ?? null
}

export function isPortBindable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close(() => resolve(true))
    })
    server.listen(port, "127.0.0.1")
  })
}

export async function allocatePort(start = 5200): Promise<number> {
  pruneDead()
  const registered = new Set(listInstances().map((i) => i.port))
  let port = start
  for (;;) {
    while (registered.has(port)) port++
    if (await isPortBindable(port)) return port
    port++
  }
}

export function writeInstance(instance: DeckInstance): void {
  ensureDir()
  fs.writeFileSync(instancePath(instance.port), JSON.stringify(instance, null, 2))
}

export function removeInstance(port: number): void {
  const p = instancePath(port)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

export function stopInstance(port: number): boolean {
  const p = instancePath(port)
  if (!fs.existsSync(p)) return false
  const inst = JSON.parse(fs.readFileSync(p, "utf-8")) as DeckInstance
  try {
    process.kill(inst.pid, "SIGTERM")
  } catch {
    // already dead
  }
  removeInstance(port)
  return true
}

export function stopAll(): number {
  const instances = listInstances()
  for (const inst of instances) {
    stopInstance(inst.port)
  }
  return instances.length
}
