export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { email: session.email },
    include: { signatures: { orderBy: { createdAt: 'asc' } } }
  })

  return userSettings?.signatures || []
})
