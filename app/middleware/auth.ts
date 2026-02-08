export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser, loading } = useAuth()

  if (loading.value && !user.value) {
    await fetchUser()
  }

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register']

  if (!user.value && !publicRoutes.includes(to.path)) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (user.value && publicRoutes.includes(to.path) && to.query.addAccount !== 'true') {
    const redirect = to.query.redirect as string
    const target = redirect && redirect !== '/' && !publicRoutes.includes(redirect) ? redirect : '/inbox'
    return navigateTo(target)
  }
})
