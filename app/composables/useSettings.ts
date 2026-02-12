interface UserSettings {
  pushNotifications: boolean
  newEmailSound: boolean
  sendEmailSound: boolean
  pollInterval: number // seconds
}

const defaults: UserSettings = {
  pushNotifications: true,
  newEmailSound: true,
  sendEmailSound: true,
  pollInterval: 30
}

const settings = reactive<UserSettings>({ ...defaults })
let settingsLoadedFor = ''

function getStorageKey(email: string) {
  return `hourmail_settings_${email}`
}

export function useSettings() {
  function loadSettings(email: string) {
    if (!import.meta.client || settingsLoadedFor === email) return
    settingsLoadedFor = email

    // Load from localStorage immediately (fast cache)
    try {
      const stored = localStorage.getItem(getStorageKey(email))
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.assign(settings, { ...defaults, ...parsed })
      }
    } catch { /* ignore */ }

    // Background sync from DB
    $fetch('/api/settings').then((remote) => {
      if (remote && settingsLoadedFor === email) {
        Object.assign(settings, { ...defaults, ...remote })
        localStorage.setItem(getStorageKey(email), JSON.stringify({ ...settings }))
      }
    }).catch(() => { /* silent */ })
  }

  function saveSettings(email: string) {
    if (!import.meta.client) return
    localStorage.setItem(getStorageKey(email), JSON.stringify({ ...settings }))
  }

  async function updateSetting<K extends keyof UserSettings>(email: string, key: K, value: UserSettings[K]) {
    settings[key] = value
    saveSettings(email)

    await $fetch('/api/settings', {
      method: 'PUT',
      body: { [key]: value }
    })
  }

  return {
    settings,
    loadSettings,
    saveSettings,
    updateSetting
  }
}
