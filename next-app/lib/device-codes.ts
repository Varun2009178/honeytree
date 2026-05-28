// In-memory device code store (shared across API routes within the same server process)
// In production, replace with Redis or database storage

interface DeviceCodeEntry {
  userCode: string
  expiresAt: number
  status: "pending" | "complete"
  accessToken?: string
  userId?: string
  username?: string
}

const store = new Map<string, DeviceCodeEntry>()

export function setDeviceCode(deviceCode: string, entry: DeviceCodeEntry) {
  store.set(deviceCode, entry)
}

export function getDeviceCode(deviceCode: string) {
  return store.get(deviceCode)
}

export function deleteDeviceCode(deviceCode: string) {
  store.delete(deviceCode)
}

export function findByUserCode(userCode: string): DeviceCodeEntry | null {
  for (const [, val] of store) {
    if (val.userCode === userCode) return val
  }
  return null
}

export function cleanExpired() {
  const now = Date.now()
  for (const [key, val] of store) {
    if (val.expiresAt < now) store.delete(key)
  }
}
