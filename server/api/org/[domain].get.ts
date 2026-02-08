export default defineEventHandler(async (event) => {
  const domain = getRouterParam(event, 'domain')

  if (!domain) {
    throw createError({ statusCode: 400, message: 'Domain is required' })
  }

  const org = await prisma.organization.findUnique({
    where: { domain: domain.toLowerCase() },
    select: {
      name: true,
      domain: true,
      createdAt: true
    }
  })

  if (!org) {
    throw createError({ statusCode: 404, message: 'Organization not found' })
  }

  return org
})
