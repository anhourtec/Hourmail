export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid body' })
  }

  const data: Record<string, boolean | number> = {}
  if (typeof body.pushNotifications === 'boolean') data.pushNotifications = body.pushNotifications
  if (typeof body.newEmailSound === 'boolean') data.newEmailSound = body.newEmailSound
  if (typeof body.sendEmailSound === 'boolean') data.sendEmailSound = body.sendEmailSound
  if (typeof body.pollInterval === 'number' && body.pollInterval >= 15 && body.pollInterval <= 600) {
    data.pollInterval = body.pollInterval
  }

  const settings = await prisma.userSettings.upsert({
    where: { email: session.email },
    create: { email: session.email, ...data },
    update: data
  })

  return {
    pushNotifications: settings.pushNotifications,
    newEmailSound: settings.newEmailSound,
    sendEmailSound: settings.sendEmailSound,
    pollInterval: settings.pollInterval
  }
})
