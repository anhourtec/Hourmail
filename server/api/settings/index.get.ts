export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const settings = await prisma.userSettings.findUnique({
    where: { email: session.email }
  })

  if (!settings) {
    return {
      pushNotifications: true,
      newEmailSound: true,
      sendEmailSound: true,
      pollInterval: 30
    }
  }

  return {
    pushNotifications: settings.pushNotifications,
    newEmailSound: settings.newEmailSound,
    sendEmailSound: settings.sendEmailSound,
    pollInterval: settings.pollInterval
  }
})
