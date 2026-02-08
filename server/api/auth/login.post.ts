export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  // Extract domain from email
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) {
    throw createError({ statusCode: 400, message: 'Invalid email address' })
  }

  // Rate limiting: max 5 attempts per email per 15 minutes
  const rateLimitKey = `ratelimit:login:${email.toLowerCase()}`
  const attempts = await redis.incr(rateLimitKey)
  if (attempts === 1) {
    await redis.expire(rateLimitKey, 900) // 15 minutes
  }
  if (attempts > 5) {
    throw createError({ statusCode: 429, message: 'Too many login attempts. Try again in 15 minutes.' })
  }

  // Look up organization by domain
  const org = await prisma.organization.findUnique({
    where: { domain }
  })

  if (!org) {
    throw createError({
      statusCode: 404,
      message: `No organization registered for domain "${domain}". Ask your admin to register at /register.`
    })
  }

  // Authenticate against IMAP server
  const authResult = await verifyImapCredentials(
    org.imapHost,
    org.imapPort,
    org.tlsMode,
    org.rejectUnauthorized,
    email,
    password
  )

  if (!authResult.success) {
    throw createError({
      statusCode: 401,
      message: `Authentication failed: ${authResult.error}`
    })
  }

  // Clear rate limit on success
  await redis.del(rateLimitKey)

  // Encrypt password with AES-256-GCM for subsequent IMAP/SMTP operations during the session
  const encryptedPassword = encryptPassword(password)
  const sessionData = {
    email: email.toLowerCase(),
    orgId: org.id,
    imapHost: org.imapHost,
    imapPort: org.imapPort,
    smtpHost: org.smtpHost,
    smtpPort: org.smtpPort,
    tlsMode: org.tlsMode,
    rejectUnauthorized: org.rejectUnauthorized
  }

  const token = await createSession(event, sessionData)

  // Store encrypted password separately with same TTL
  await redis.set(`password:${token}`, encryptedPassword, 'EX', 60 * 60 * 24)

  return {
    success: true,
    user: {
      email: email.toLowerCase(),
      organization: org.name
    }
  }
})
