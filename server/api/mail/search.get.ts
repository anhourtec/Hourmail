export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const token = getCookie(event, 'hourinbox_session')!
  const encryptedPassword = await redis.get(`password:${token}`)
  if (!encryptedPassword) {
    throw createError({ statusCode: 401, message: 'Session expired' })
  }

  const query = getQuery(event)
  const folder = (query.folder as string) || 'INBOX'
  const limit = Math.min(parseInt(query.limit as string) || 50, 100)

  const searchQuery: Record<string, string | number | boolean | Date> = {}
  if (query.q) searchQuery.text = query.q as string
  if (query.from) searchQuery.from = query.from as string
  if (query.to) searchQuery.to = query.to as string
  if (query.subject) searchQuery.subject = query.subject as string
  if (query.since) searchQuery.since = query.since as string
  if (query.before) searchQuery.before = query.before as string
  if (query.larger) searchQuery.larger = parseInt(query.larger as string)
  if (query.smaller) searchQuery.smaller = parseInt(query.smaller as string)

  if (Object.keys(searchQuery).length === 0) {
    throw createError({ statusCode: 400, message: 'At least one search parameter is required' })
  }

  const password = decryptPassword(encryptedPassword)

  // Cache search results in Redis for 30s to avoid repeated IMAP roundtrips
  const cacheKey = `search:${token}:${folder}:${JSON.stringify(searchQuery)}:${limit}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  try {
    const result = await searchMessages(session, password, folder, searchQuery, limit)
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 30)
    return result
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP search error: ${error.message}` })
  }
})
