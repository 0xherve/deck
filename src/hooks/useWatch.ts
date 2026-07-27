import { useEffect, useRef } from "react"

export interface WatchEvent {
  event: "rename" | "change"
  path: string
}

type WatchListener = (e: WatchEvent) => void

let sharedSource: EventSource | null = null
let refCount = 0
const listeners = new Set<WatchListener>()

function ensureSource() {
  if (sharedSource) return sharedSource

  const es = new EventSource("/api/watch")
  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data) as WatchEvent
      for (const listener of listeners) listener(data)
    } catch {
      // ignore malformed payloads
    }
  }
  es.onerror = () => {
    es.close()
    if (sharedSource === es) sharedSource = null
  }
  sharedSource = es
  return es
}

/**
 * Subscribes to server-sent filesystem watch events for the whole project.
 * Connections are shared across callers and torn down when the last
 * subscriber unmounts.
 */
export function useWatch(onEvent: WatchListener) {
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  })

  useEffect(() => {
    const listener: WatchListener = (e) => onEventRef.current(e)
    listeners.add(listener)
    refCount += 1
    ensureSource()

    return () => {
      listeners.delete(listener)
      refCount -= 1
      if (refCount <= 0 && sharedSource) {
        sharedSource.close()
        sharedSource = null
      }
    }
  }, [])
}
