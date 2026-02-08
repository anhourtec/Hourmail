export default defineEventHandler(async (event) => {
  const domainParam = getRouterParam(event, 'domain')

  if (!domainParam) {
    throw createError({ statusCode: 400, message: 'Domain is required' })
  }

  const body = await readBody(event)
  const { name, imapHost, imapPort, smtpHost, smtpPort, tlsMode, rejectUnauthorized } = body

  const org = await prisma.organization.findUnique({
    where: { domain: domainParam.toLowerCase() }
  })

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  const updated = await prisma.organization.update({
    where: { domain: domainParam.toLowerCase() },
    data: {
      ...(name !== undefined && { name }),
      ...(imapHost !== undefined && { imapHost: imapHost.trim() }),
      ...(imapPort !== undefined && { imapPort }),
      ...(smtpHost !== undefined && { smtpHost: smtpHost.trim() }),
      ...(smtpPort !== undefined && { smtpPort }),
      ...(tlsMode !== undefined && { tlsMode }),
      ...(rejectUnauthorized !== undefined && { rejectUnauthorized })
    }
  })

  return {
    success: true,
    organization: {
      name: updated.name,
      domain: updated.domain,
      imapHost: updated.imapHost,
      smtpHost: updated.smtpHost
    }
  }
})
