export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { name: true, domain: true }
  })

  return {
    email: session.email,
    organization: org?.name || 'Unknown',
    domain: org?.domain || ''
  }
})
