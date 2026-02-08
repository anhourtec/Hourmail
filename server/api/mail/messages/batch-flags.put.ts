export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const token = getCookie(event, 'hourmail_session')!
  const encryptedPassword = await redis.get(`password:${token}`)
  if (!encryptedPassword) {
    throw createError({ statusCode: 401, message: 'Session expired' })
  }

  const password = decryptPassword(encryptedPassword)
  const body = await readBody(event)
  const { uids, folder = 'INBOX', addFlags, removeFlags } = body

  if (!Array.isArray(uids) || uids.length === 0) {
    throw createError({ statusCode: 400, message: 'Missing or empty uids array' })
  }

  try {
    await updateMessageFlagsBatch(session, password, folder, uids, {
      add: addFlags,
      remove: removeFlags
    })
    invalidateMailCache(session.email, folder).catch(() => {})
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
