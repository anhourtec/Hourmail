export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, domain, imapHost, imapPort, smtpHost, smtpPort, tlsMode, rejectUnauthorized } = body

  // Validate required fields
  if (!name || !domain || !imapHost || !smtpHost) {
    throw createError({
      statusCode: 400,
      message: 'Name, domain, IMAP host, and SMTP host are required'
    })
  }

  // Normalize domain
  const normalizedDomain = domain.toLowerCase().trim()

  // Check if domain is already registered
  const existing = await prisma.organization.findUnique({
    where: { domain: normalizedDomain }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `Domain "${normalizedDomain}" is already registered`
    })
  }

  const resolvedImapPort = imapPort || 993
  const resolvedSmtpPort = smtpPort || 465
  const resolvedTlsMode = tlsMode || 'tls'
  const resolvedRejectUnauthorized = rejectUnauthorized !== false

  // Test IMAP connection
  const imapTest = await testConnection(imapHost.trim(), resolvedImapPort, resolvedTlsMode, resolvedRejectUnauthorized)
  if (!imapTest.success) {
    throw createError({
      statusCode: 422,
      message: `IMAP connection failed: ${imapTest.error}`
    })
  }

  // Test SMTP connection
  const smtpTest = await testConnection(smtpHost.trim(), resolvedSmtpPort, resolvedTlsMode, resolvedRejectUnauthorized)
  if (!smtpTest.success) {
    throw createError({
      statusCode: 422,
      message: `SMTP connection failed: ${smtpTest.error}`
    })
  }

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: name.trim(),
      domain: normalizedDomain,
      imapHost: imapHost.trim(),
      imapPort: resolvedImapPort,
      smtpHost: smtpHost.trim(),
      smtpPort: resolvedSmtpPort,
      tlsMode: resolvedTlsMode,
      rejectUnauthorized: resolvedRejectUnauthorized
    }
  })

  return {
    success: true,
    organization: {
      id: org.id,
      name: org.name,
      domain: org.domain
    }
  }
})
