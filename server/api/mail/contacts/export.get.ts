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

  try {
    const serverContacts = await collectAddresses(session, password)

    // Accept additional contacts from query param (JSON-encoded array from localStorage)
    const localParam = getQuery(event).local as string | undefined
    let allContacts = serverContacts.map(c => ({ name: c.name, email: c.address }))

    if (localParam) {
      try {
        const local: { name: string, address: string }[] = JSON.parse(localParam)
        const seen = new Set(allContacts.map(c => c.email.toLowerCase()))
        for (const c of local) {
          const key = c.address.toLowerCase()
          if (!seen.has(key)) {
            allContacts.push({ name: c.name, email: c.address })
            seen.add(key)
          }
        }
      } catch { /* ignore invalid JSON */ }
    }

    // Sort by name/email
    allContacts.sort((a, b) =>
      (a.name || a.email).toLowerCase().localeCompare((b.name || b.email).toLowerCase())
    )

    const vcf = generateVCard(allContacts)

    setResponseHeaders(event, {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': 'attachment; filename="contacts.vcf"'
    })

    return vcf
  } catch (err: unknown) {
    const error = err as Error
    throw createError({ statusCode: 502, message: `IMAP error: ${error.message}` })
  }
})
