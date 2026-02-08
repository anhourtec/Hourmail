// Cache helper — only caches folder/message list metadata (not email content)
// All cached data is ephemeral and auto-expires

export async function invalidateMailCache(email: string) {
  const keys = await redis.keys(`cache:*:${email}:*`)
  const folderKey = `cache:folders:${email}`
  const allKeys = [...keys, folderKey]
  if (allKeys.length > 0) {
    await redis.del(...allKeys)
  }
}
