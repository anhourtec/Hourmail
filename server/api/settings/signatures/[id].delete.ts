export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing signature id' })
  }

  // Verify ownership
  const existing = await prisma.signature.findUnique({
    where: { id },
    include: { userSettings: true }
  })

  if (!existing || existing.userSettings.email !== session.email) {
    throw createError({ statusCode: 404, message: 'Signature not found' })
  }

  await prisma.signature.delete({ where: { id } })

  // If deleted signature was default, reassign default to first remaining
  if (existing.isDefault) {
    const first = await prisma.signature.findFirst({
      where: { userSettingsId: existing.userSettingsId },
      orderBy: { createdAt: 'asc' }
    })
    if (first) {
      await prisma.signature.update({
        where: { id: first.id },
        data: { isDefault: true }
      })
    }
  }

  return { success: true }
})
