export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email } = body

  if (!email) {
    throw createError({ statusCode: 400, message: 'Email is required' })
  }

  const switched = await switchAccount(event, email)
  if (!switched) {
    throw createError({ statusCode: 404, message: 'Account not found' })
  }

  // Return the new active user's info
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 500, message: 'Switch failed' })
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { name: true, domain: true }
  })

  return {
    success: true,
    user: {
      email: session.email,
      organization: org?.name || 'Unknown',
      domain: org?.domain || ''
    }
  }
})
