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

  const password = decryptPassword(encryptedPassword)
  const uid = parseInt(getRouterParam(event, 'uid') || '0')
  const body = await readBody(event)
  const { folder = 'INBOX', addFlags, removeFlags } = body

  if (!uid) {
    throw createError({ statusCode: 400, message: 'Invalid message UID' })
  }

  try {
    await updateMessageFlags(session, password, folder, uid, {
      add: addFlags,
      remove: removeFlags
    })
    await invalidateMailCache(session.email)
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
