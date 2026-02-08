export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, loading } = useAuth()

  if (loading.value && !user.value) {
    await fetchUser()
  }

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register']

  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (user.value && publicRoutes.includes(to.path) && to.query.addAccount !== 'true') {
    return navigateTo('/inbox')
  }
})
