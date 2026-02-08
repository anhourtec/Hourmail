let pollTimer: ReturnType<typeof setInterval> | null = null
let lastKnownUnseen = -1
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

// Generate notification sounds using Web Audio API (no external files needed)
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') ctx.resume()

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch { /* audio not available */ }
}

export function useNotifications() {
  const { settings } = useSettings()
  const { folders } = useMail()

  const notificationPermission = ref<NotificationPermission>(
    import.meta.client && 'Notification' in window ? Notification.permission : 'default'
  )

  async function requestPermission(): Promise<boolean> {
    if (!import.meta.client || !('Notification' in window)) return false
    const result = await Notification.requestPermission()
    notificationPermission.value = result
    return result === 'granted'
  }

  function showNotification(title: string, body: string) {
    if (!import.meta.client) return
    if (!settings.pushNotifications) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'hourmail-new-email'
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }

  function playNewEmailSound(force = false) {
    if (!force && !settings.newEmailSound) return
    // Two-tone ascending chime
    playTone(587, 0.15, 'sine', 0.2) // D5
    setTimeout(() => playTone(880, 0.25, 'sine', 0.2), 150) // A5
  }

  function playSendEmailSound(force = false) {
    if (!force && !settings.sendEmailSound) return
    // Whoosh-like send sound: quick ascending sweep
    playTone(440, 0.1, 'sine', 0.15)
    setTimeout(() => playTone(660, 0.1, 'sine', 0.15), 80)
    setTimeout(() => playTone(880, 0.15, 'sine', 0.1), 160)
  }

  async function checkForNewEmails() {
    try {
      const data = await $fetch<{ folders: { path: string, unseen: number }[] }>('/api/mail/folders')
      const inbox = data.folders.find(f => f.path === 'INBOX')
      if (!inbox) return

      const currentUnseen = inbox.unseen

      // On first check, just record the count
      if (lastKnownUnseen === -1) {
        lastKnownUnseen = currentUnseen
        return
      }

      // New emails arrived
      if (currentUnseen > lastKnownUnseen) {
        const newCount = currentUnseen - lastKnownUnseen
        showNotification(
          'New email',
          `You have ${newCount} new ${newCount === 1 ? 'message' : 'messages'}`
        )
        playNewEmailSound()
      }

      lastKnownUnseen = currentUnseen

      // Also update the folder list with fresh unseen counts
      if (folders.value.length > 0) {
        for (const f of data.folders) {
          const existing = folders.value.find(ef => ef.path === f.path)
          if (existing) {
            existing.unseen = f.unseen
          }
        }
      }
    } catch {
      // Silent fail — network issues shouldn't break polling
    }
  }

  function startPolling() {
    stopPolling()
    if (!import.meta.client) return

    // Initial check
    checkForNewEmails()

    pollTimer = setInterval(() => {
      checkForNewEmails()
    }, settings.pollInterval * 1000)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function resetPolling() {
    lastKnownUnseen = -1
    startPolling()
  }

  return {
    notificationPermission: readonly(notificationPermission),
    requestPermission,
    showNotification,
    playNewEmailSound,
    playSendEmailSound,
    startPolling,
    stopPolling,
    resetPolling
  }
}
