export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody(event)
  if (!body?.name || typeof body.body !== 'string') {
    throw createError({ statusCode: 400, message: 'name and body are required' })
  }

  if (body.body.length > 512_000) {
    throw createError({ statusCode: 400, message: 'Signature body too large (max 500KB)' })
  }

  // Ensure UserSettings exists
  const userSettings = await prisma.userSettings.upsert({
    where: { email: session.email },
    create: { email: session.email },
    update: {},
    include: { signatures: true }
  })

  // Auto-default if first signature
  const isDefault = body.isDefault === true || userSettings.signatures.length === 0

  // If setting as default, unset others
  if (isDefault && userSettings.signatures.length > 0) {
    await prisma.signature.updateMany({
      where: { userSettingsId: userSettings.id },
      data: { isDefault: false }
    })
  }

  const signature = await prisma.signature.create({
    data: {
      userSettingsId: userSettings.id,
      name: body.name,
      body: body.body,
      isDefault
    }
  })

  return signature
})
