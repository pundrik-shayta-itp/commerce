export class NotificationCenter {
  constructor() {
    this.subscribers = new Set()
    this.dedupMap = new Map()
    this.ttlMs = 1800
  }

  subscribe(handler) {
    this.subscribers.add(handler)
    return () => this.subscribers.delete(handler)
  }

  notify(event) {
    const dedupKey = `${event.type}:${event.message}`
    const lastSeen = this.dedupMap.get(dedupKey) ?? 0
    const now = Date.now()
    if (now - lastSeen < this.ttlMs) {
      return
    }

    this.dedupMap.set(dedupKey, now)
    this.subscribers.forEach((handler) => handler({ ...event, id: crypto.randomUUID() }))
  }
}
