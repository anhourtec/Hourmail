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
  const uid = parseInt(query.uid as string)
  const folder = query.folder as string

  if (!uid || !folder) {
    throw createError({ statusCode: 400, message: 'Missing uid or folder' })
  }

  const password = decryptPassword(encryptedPassword)

  try {
    const content = await getDraftContent(session, password, folder, uid)
    if (!content) {
      throw createError({ statusCode: 404, message: 'Draft not found' })
    }
    return content
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode) throw err
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
