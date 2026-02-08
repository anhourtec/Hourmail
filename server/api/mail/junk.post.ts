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

  const body = await readBody(event)
  const { uid, folder } = body

  if (!uid || !folder) {
    throw createError({ statusCode: 400, message: 'Missing uid or folder' })
  }

  const password = decryptPassword(encryptedPassword)

  try {
    // Find the Junk/Spam folder
    const folders = await listFolders(session, password)
    const junkFolder = folders.find(f =>
      f.specialUse === '\\Junk'
    )

    if (!junkFolder) {
      throw createError({ statusCode: 400, message: 'No junk folder found on this server' })
    }

    await moveMessage(session, password, folder, uid, junkFolder.path)
    return { success: true, movedTo: junkFolder.path }
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode) throw err
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
