const BASE_URL = 'https://jsonplaceholder.typicode.com'
const MIRROR_PREFIX = 'commerce.remote.mirror'

function getUserIdFromUsername(username) {
  if (!username) {
    return 1
  }
  let sum = 0
  for (let index = 0; index < username.length; index += 1) {
    sum += username.charCodeAt(index)
  }
  return (sum % 10) + 1
}

function mirrorKey(username) {
  return `${MIRROR_PREFIX}:${username ?? 'guest'}`
}

function readMirror(username) {
  const raw = localStorage.getItem(mirrorKey(username))
  if (!raw) {
    return { orders: [], logs: [], snapshots: [] }
  }
  try {
    return JSON.parse(raw)
  } catch {
    return { orders: [], logs: [], snapshots: [] }
  }
}

function writeMirror(username, next) {
  localStorage.setItem(mirrorKey(username), JSON.stringify(next))
}

export async function fetchRemoteBootstrap(username) {
  const userId = getUserIdFromUsername(username)
  const [ordersResponse, logsResponse] = await Promise.all([
    fetch(`${BASE_URL}/posts?userId=${userId}`),
    fetch(`${BASE_URL}/comments?postId=${userId}`),
  ])

  if (!ordersResponse.ok || !logsResponse.ok) {
    throw new Error('Failed to fetch remote history')
  }

  const orders = await ordersResponse.json()
  const logs = await logsResponse.json()
  const mirror = readMirror(username)

  return {
    orders: mirror.orders.length
      ? mirror.orders
      : orders.slice(0, 15).map((order) => ({
          id: `R-ORD-${order.id}`,
          items: [],
          total: 0,
          createdAt: new Date().toISOString(),
          source: 'jsonplaceholder',
          note: order.title,
        })),
    logs: mirror.logs.length
      ? mirror.logs
      : logs.slice(0, 20).map((log) => ({
          id: `R-LOG-${log.id}`,
          status: 'ORDER_SUBMITTED',
          reason: log.name,
          timestamp: new Date().toISOString(),
        })),
  }
}

export async function pushOrderToRemote(username, order) {
  const userId = getUserIdFromUsername(username)
  await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: order.id,
      body: JSON.stringify({ total: order.total, items: order.items.length }),
    }),
  })

  const mirror = readMirror(username)
  writeMirror(username, {
    ...mirror,
    orders: [{ ...order }, ...mirror.orders].slice(0, 100),
  })
}

export async function pushTimelineStepToRemote(username, step) {
  const userId = getUserIdFromUsername(username)
  await fetch(`${BASE_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postId: userId,
      name: step.status,
      email: `${userId}@commerce.local`,
      body: step.reason || 'timeline update',
    }),
  })

  const mirror = readMirror(username)
  writeMirror(username, {
    ...mirror,
    logs: [{ ...step }, ...mirror.logs].slice(0, 200),
  })
}

export async function pushSessionSnapshotToRemote(username, snapshot) {
  const userId = getUserIdFromUsername(username)
  await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: 'session-snapshot',
      body: JSON.stringify(snapshot),
    }),
  })

  const mirror = readMirror(username)
  writeMirror(username, {
    ...mirror,
    snapshots: [{ ...snapshot }, ...mirror.snapshots].slice(0, 50),
  })
}
