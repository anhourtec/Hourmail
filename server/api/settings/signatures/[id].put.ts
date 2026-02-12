export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing signature id' })
  }

  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'Missing body' })
  }

  if (typeof body.body === 'string' && body.body.length > 512_000) {
    throw createError({ statusCode: 400, message: 'Signature body too large (max 500KB)' })
  }

  // Verify ownership
  const existing = await prisma.signature.findUnique({
    where: { id },
    include: { userSettings: true }
  })

  if (!existing || existing.userSettings.email !== session.email) {
    throw createError({ statusCode: 404, message: 'Signature not found' })
  }

  // If setting as default, unset others first
  if (body.isDefault === true) {
    await prisma.signature.updateMany({
      where: { userSettingsId: existing.userSettingsId, id: { not: id } },
      data: { isDefault: false }
    })
  }

  const data: Record<string, string | boolean> = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.body === 'string') data.body = body.body
  if (typeof body.isDefault === 'boolean') data.isDefault = body.isDefault

  const updated = await prisma.signature.update({
    where: { id },
    data
  })

  return updated
})
