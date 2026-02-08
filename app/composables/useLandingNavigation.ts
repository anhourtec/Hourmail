export function useLandingNavigation() {
  const navLinks = [
    { label: 'Home', to: '/home' },
    { label: 'Features', to: '/features' },
    { label: 'Support', to: '/support' }
  ]

  const authLinks = [
    { label: 'Login', to: '/login', primary: false },
    { label: 'Get Started', to: '/register', primary: true }
  ]

  return { navLinks, authLinks }
}
