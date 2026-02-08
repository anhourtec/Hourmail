export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, domain, imapHost, imapPort, smtpHost, smtpPort, useTls } = body

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
  const resolvedUseTls = useTls !== false

  // Test IMAP connection
  const imapTest = await testConnection(imapHost.trim(), resolvedImapPort, resolvedUseTls)
  if (!imapTest.success) {
    throw createError({
      statusCode: 422,
      message: `IMAP connection failed: ${imapTest.error}`
    })
  }

  // Test SMTP connection
  const smtpTest = await testConnection(smtpHost.trim(), resolvedSmtpPort, resolvedUseTls)
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
      useTls: resolvedUseTls
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
