interface User {
  email: string
  organization: string
  domain: string
}

interface Account {
  email: string
  organization?: string
  domain?: string
  active: boolean
}

const user = ref<User | null>(null)
const accounts = ref<Account[]>([])
const loading = ref(true)
const switchingAccount = ref(false)

export function useAuth() {
  async function fetchUser() {
    try {
      loading.value = true
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  async function fetchAccounts() {
    try {
      const data = await $fetch<{ accounts: Account[] }>('/api/auth/accounts')
      accounts.value = data.accounts
    } catch {
      accounts.value = []
    }
  }

  async function login(email: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    await fetchUser()
    await fetchAccounts()
    return result
  }

  async function switchAccount(email: string) {
    if (email === user.value?.email) return
    switchingAccount.value = true
    try {
      await $fetch('/api/auth/switch', {
        method: 'POST',
        body: { email }
      })
      // Clear all cached state so the reload starts fresh
      const { resetAllState } = useMail()
      resetAllState()
      // Full reload to cleanly re-initialize everything for the new account
      reloadNuxtApp({ path: '/inbox' })
    } catch {
      switchingAccount.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    const { resetAllState } = useMail()
    resetAllState()
    // Check if there are remaining accounts by peeking at the server
    try {
      const data = await $fetch<{ accounts: Account[] }>('/api/auth/accounts')
      if (data.accounts.length > 0) {
        // Server auto-switched to next account — full reload to re-initialize
        reloadNuxtApp({ path: '/inbox' })
        return
      }
    } catch {
      // No accounts left
    }
    user.value = null
    accounts.value = []
    navigateTo('/login')
  }

  return {
    user: readonly(user),
    accounts: readonly(accounts),
    loading: readonly(loading),
    switchingAccount: readonly(switchingAccount),
    fetchUser,
    fetchAccounts,
    login,
    switchAccount,
    logout
  }
}
