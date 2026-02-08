// Cache helper — only caches folder/message list metadata (not email content)
// All cached data is ephemeral and auto-expires

// Track cache keys per user with a Redis set (avoids O(N) KEYS scan)
const CACHE_INDEX_PREFIX = 'cache:idx:'

/** Set a cache value and track the key for per-user invalidation */
export async function setMailCache(email: string, key: string, data: unknown, ttlSeconds: number = 30) {
  const indexKey = `${CACHE_INDEX_PREFIX}${email}`
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
  await redis.sadd(indexKey, key)
  await redis.expire(indexKey, 300) // 5 min TTL on the index itself
}

export async function invalidateMailCache(email: string, folder?: string) {
  const indexKey = `${CACHE_INDEX_PREFIX}${email}`
  const keys = await redis.smembers(indexKey)

  if (keys.length === 0) return

  let toDelete: string[]
  if (folder) {
    // Selective: only delete keys for the specific folder + starred cache
    toDelete = keys.filter(k =>
      k.includes(`:${email}:${folder}:`) || k.includes(`:starred:${email}`)
    )
  } else {
    toDelete = keys
  }

  const folderKey = `cache:folders:${email}`
  const starredKey = `cache:starred:${email}`
  const allKeys = [...new Set([...toDelete, folderKey, starredKey])]

  if (allKeys.length > 0) {
    await redis.del(...allKeys)
    // Remove deleted keys from the index
    if (toDelete.length > 0) await redis.srem(indexKey, ...toDelete)
  }
}
