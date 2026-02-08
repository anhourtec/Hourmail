interface MailFolder {
  path: string
  name: string
  specialUse?: string
  messages: number
  unseen: number
}

interface MailAddress {
  name: string
  address: string
}

interface MailMessage {
  uid: number
  seq: number
  messageId?: string
  subject: string
  from: MailAddress[]
  to: MailAddress[]
  date: string
  flags: string[]
  preview: string
}

interface MailMessageFull extends MailMessage {
  html: string
  text: string
  cc?: MailAddress[]
  attachments: { filename: string, size: number, contentType: string }[]
}

interface CachedPage {
  messages: MailMessage[]
  total: number
  fetchedAt: number
}

// Use module-level refs for cross-component reactivity
const folders = ref<MailFolder[]>([])
const messages = ref<MailMessage[]>([])
const currentMessage = ref<MailMessageFull | null>(null)
const totalMessages = ref(0)
const loadingFolders = ref(false)
const loadingMessages = ref(false)
const loadingMessage = ref(false)
const currentFolder = ref('INBOX')
const currentPage = ref(1)
const selectedMessages = ref<Set<number>>(new Set())
const searchActive = ref(false)
const searchLoading = ref(false)

// Client-side message cache: key = "folder:page"
const messageCache = new Map<string, CachedPage>()
const clientCacheEnabled = ref(true)
let cacheInitialized = false

const SESSION_CACHE_KEY = 'hourinbox_msg_cache'
const SESSION_FOLDERS_KEY = 'hourinbox_folders'
const SESSION_STATE_KEY = 'hourinbox_state'
const CACHE_MAX_AGE = 5 * 60 * 1000 // 5 minutes

function persistCacheToSession() {
  if (!import.meta.client) return
  try {
    const obj: Record<string, CachedPage> = {}
    for (const [k, v] of messageCache.entries()) obj[k] = v
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(obj))
  } catch { /* quota exceeded — ignore */ }
}

function restoreCacheFromSession() {
  if (!import.meta.client) return
  try {
    const stored = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!stored) return
    const obj = JSON.parse(stored) as Record<string, CachedPage>
    const now = Date.now()
    for (const [k, v] of Object.entries(obj)) {
      // Only restore entries less than 5 minutes old
      if (now - v.fetchedAt < CACHE_MAX_AGE) {
        messageCache.set(k, v)
      }
    }
  } catch { /* ignore */ }
}

function persistFoldersToSession() {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(SESSION_FOLDERS_KEY, JSON.stringify(folders.value))
  } catch { /* ignore */ }
}

function restoreFoldersFromSession() {
  if (!import.meta.client) return
  try {
    const stored = sessionStorage.getItem(SESSION_FOLDERS_KEY)
    if (stored) folders.value = JSON.parse(stored)
  } catch { /* ignore */ }
}

function persistStateToSession() {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify({
      currentFolder: currentFolder.value,
      currentPage: currentPage.value
    }))
  } catch { /* ignore */ }
}

function restoreStateFromSession() {
  if (!import.meta.client) return
  try {
    const stored = sessionStorage.getItem(SESSION_STATE_KEY)
    if (!stored) return
    const state = JSON.parse(stored)
    if (state.currentFolder) currentFolder.value = state.currentFolder
    if (state.currentPage) currentPage.value = state.currentPage
  } catch { /* ignore */ }
}

export function useMail() {
  // Initialize cache setting and restore session on first call
  if (!cacheInitialized && import.meta.client) {
    const cookie = useCookie<boolean>('hourinbox_cache_enabled', { default: () => true })
    clientCacheEnabled.value = cookie.value !== false

    // Restore persisted data from sessionStorage for instant page load
    restoreCacheFromSession()
    restoreFoldersFromSession()
    restoreStateFromSession()

    cacheInitialized = true
  }

  // --- Cache helpers ---

  function invalidateFolderCache(folder: string) {
    for (const key of messageCache.keys()) {
      if (key.startsWith(`${folder}:`)) {
        messageCache.delete(key)
      }
    }
    persistCacheToSession()
  }

  function clearMessageCache() {
    messageCache.clear()
    if (import.meta.client) sessionStorage.removeItem(SESSION_CACHE_KEY)
  }

  function resetAllState() {
    // Clear everything for account switch
    messageCache.clear()
    messages.value = []
    folders.value = []
    currentMessage.value = null
    totalMessages.value = 0
    currentFolder.value = 'INBOX'
    currentPage.value = 1
    selectedMessages.value = new Set()
    searchActive.value = false
    searchLoading.value = false
    if (import.meta.client) {
      sessionStorage.removeItem(SESSION_CACHE_KEY)
      sessionStorage.removeItem(SESSION_FOLDERS_KEY)
      sessionStorage.removeItem(SESSION_STATE_KEY)
    }
  }

  function setClientCacheEnabled(enabled: boolean) {
    clientCacheEnabled.value = enabled
    if (!enabled) clearMessageCache()
  }

  function updateCurrentPageCache() {
    if (!clientCacheEnabled.value) return
    const cacheKey = `${currentFolder.value}:${currentPage.value}`
    messageCache.set(cacheKey, {
      messages: [...messages.value],
      total: totalMessages.value,
      fetchedAt: Date.now()
    })
    persistCacheToSession()
  }

  // --- Fetch functions ---

  async function fetchFolders(forceRefresh = false) {
    // If we already have folders (from sessionStorage), skip the loading spinner
    // and refresh silently in the background
    if (folders.value.length > 0) {
      $fetch<{ folders: MailFolder[] }>('/api/mail/folders', {
        query: forceRefresh ? { refresh: 'true' } : undefined
      }).then((data) => {
        folders.value = data.folders
        persistFoldersToSession()
      }).catch(() => { /* silent fail - user has cached data */ })
      return
    }

    loadingFolders.value = true
    try {
      const data = await $fetch<{ folders: MailFolder[] }>('/api/mail/folders', {
        query: forceRefresh ? { refresh: 'true' } : undefined
      })
      folders.value = data.folders
      persistFoldersToSession()
    } finally {
      loadingFolders.value = false
    }
  }

  async function fetchMessages(folder: string = 'INBOX', page: number = 1, forceRefresh: boolean = false) {
    const cacheKey = `${folder}:${page}`
    const isSwitch = currentFolder.value !== folder

    // Fix stale data flash: clear old messages immediately on folder switch
    if (isSwitch) {
      messages.value = []
      totalMessages.value = 0
      selectedMessages.value = new Set()
    }

    currentFolder.value = folder
    currentPage.value = page
    persistStateToSession()

    // Check cache (if enabled, not force-refreshing, and we have a hit)
    if (clientCacheEnabled.value && !forceRefresh) {
      const cached = messageCache.get(cacheKey)
      if (cached) {
        // Show cached data instantly — no loading spinner
        messages.value = cached.messages
        totalMessages.value = cached.total

        // Background refresh silently
        $fetch<{ messages: MailMessage[], total: number }>('/api/mail/messages', {
          query: { folder, page, limit: 50 }
        }).then((data) => {
          // Only apply if user is still on the same folder+page
          if (currentFolder.value === folder && currentPage.value === page) {
            messages.value = data.messages
            totalMessages.value = data.total
          }
          // Always update cache with fresh data
          messageCache.set(cacheKey, {
            messages: data.messages,
            total: data.total,
            fetchedAt: Date.now()
          })
          persistCacheToSession()
        }).catch(() => {
          // Silent fail — user already has cached data
        })
        return
      }
    }

    // No cache hit or force refresh: show loading spinner and fetch
    loadingMessages.value = true
    try {
      const data = await $fetch<{ messages: MailMessage[], total: number }>('/api/mail/messages', {
        query: { folder, page, limit: 50 }
      })
      // Only update UI if user hasn't navigated away during the fetch
      if (currentFolder.value === folder) {
        messages.value = data.messages
        totalMessages.value = data.total
      }
      // Cache the result
      if (clientCacheEnabled.value) {
        messageCache.set(cacheKey, {
          messages: data.messages,
          total: data.total,
          fetchedAt: Date.now()
        })
        persistCacheToSession()
      }
    } finally {
      loadingMessages.value = false
    }
  }

  async function fetchMessage(identifier: number | string, folder: string = 'INBOX') {
    loadingMessage.value = true
    try {
      // If identifier is a number, use directly. If string, it's a base64url slug.
      const apiPath = `/api/mail/messages/${identifier}`
      const data = await $fetch<MailMessageFull>(apiPath, {
        query: { folder }
      })
      currentMessage.value = data
    } finally {
      loadingMessage.value = false
    }
  }

  async function searchMailMessages(query: {
    q?: string
    from?: string
    to?: string
    subject?: string
    since?: string
    before?: string
    larger?: number
    smaller?: number
    folder?: string
  }) {
    searchActive.value = true
    searchLoading.value = true
    messages.value = []
    totalMessages.value = 0
    selectedMessages.value = new Set()

    try {
      const data = await $fetch<{ messages: MailMessage[], total: number }>('/api/mail/search', {
        query: {
          ...query,
          folder: query.folder || currentFolder.value
        }
      })
      messages.value = data.messages
      totalMessages.value = data.total
    } finally {
      searchLoading.value = false
    }
  }

  function clearSearch() {
    searchActive.value = false
    searchLoading.value = false
    // Re-fetch current folder
    fetchMessages(currentFolder.value, currentPage.value, true)
  }

  // --- Mutation functions ---

  async function sendEmail(options: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    text?: string
    html?: string
    replyTo?: string
    inReplyTo?: string
  }) {
    const result = await $fetch('/api/mail/send', {
      method: 'POST',
      body: options
    })
    // Invalidate sent folder cache
    const sentFolder = folders.value.find(f => f.specialUse === '\\Sent')
    if (sentFolder) {
      invalidateFolderCache(sentFolder.path)
    }
    return result
  }

  async function toggleRead(uid: number, isRead: boolean, folder: string = 'INBOX') {
    await $fetch(`/api/mail/messages/${uid}`, {
      method: 'PUT',
      body: {
        folder,
        addFlags: isRead ? ['\\Seen'] : undefined,
        removeFlags: !isRead ? ['\\Seen'] : undefined
      }
    })
    // Update local state immediately
    const msg = messages.value.find(m => m.uid === uid)
    if (msg) {
      if (isRead && !msg.flags.includes('\\Seen')) {
        msg.flags.push('\\Seen')
      } else if (!isRead) {
        msg.flags = msg.flags.filter(f => f !== '\\Seen')
      }
    }
    updateCurrentPageCache()
  }

  async function toggleStarred(uid: number, isStarred: boolean, folder: string = 'INBOX') {
    await $fetch(`/api/mail/messages/${uid}`, {
      method: 'PUT',
      body: {
        folder,
        addFlags: isStarred ? ['\\Flagged'] : undefined,
        removeFlags: !isStarred ? ['\\Flagged'] : undefined
      }
    })
    // Update local state immediately
    const msg = messages.value.find(m => m.uid === uid)
    if (msg) {
      if (isStarred && !msg.flags.includes('\\Flagged')) {
        msg.flags.push('\\Flagged')
      } else if (!isStarred) {
        msg.flags = msg.flags.filter(f => f !== '\\Flagged')
      }
    }
    updateCurrentPageCache()
  }

  async function archiveEmail(uid: number, folder: string = 'INBOX') {
    await $fetch('/api/mail/archive', {
      method: 'POST',
      body: { uid, folder }
    })
    // Remove from local state immediately
    messages.value = messages.value.filter(m => m.uid !== uid)
    totalMessages.value = Math.max(0, totalMessages.value - 1)
    invalidateFolderCache(folder)
  }

  async function deleteEmail(uid: number, folder: string = 'INBOX') {
    await $fetch(`/api/mail/messages/${uid}`, {
      method: 'DELETE',
      query: { folder }
    })
    // Remove from local state immediately
    messages.value = messages.value.filter(m => m.uid !== uid)
    totalMessages.value = Math.max(0, totalMessages.value - 1)
    // Invalidate all pages for this folder since indices shift
    invalidateFolderCache(folder)
  }

  // --- Selection functions ---

  function toggleSelect(uid: number) {
    if (selectedMessages.value.has(uid)) {
      selectedMessages.value.delete(uid)
    } else {
      selectedMessages.value.add(uid)
    }
    selectedMessages.value = new Set(selectedMessages.value)
  }

  function selectAll() {
    if (selectedMessages.value.size === messages.value.length) {
      selectedMessages.value = new Set()
    } else {
      selectedMessages.value = new Set(messages.value.map(m => m.uid))
    }
  }

  function clearSelection() {
    selectedMessages.value = new Set()
  }

  return {
    folders,
    messages,
    currentMessage,
    totalMessages,
    currentFolder,
    currentPage,
    selectedMessages,
    loadingFolders,
    loadingMessages,
    loadingMessage,
    searchActive: readonly(searchActive),
    searchLoading: readonly(searchLoading),
    clientCacheEnabled: readonly(clientCacheEnabled),
    fetchFolders,
    fetchMessages,
    fetchMessage,
    searchMailMessages,
    clearSearch,
    sendEmail,
    toggleRead,
    toggleStarred,
    archiveEmail,
    deleteEmail,
    toggleSelect,
    selectAll,
    clearSelection,
    setClientCacheEnabled,
    clearMessageCache,
    resetAllState,
    invalidateFolderCache
  }
}
