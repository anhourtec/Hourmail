export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'hourinbox_session')
  if (token) {
    await redis.del(`password:${token}`)
  }

  await destroySession(event)

  return { success: true }
})
