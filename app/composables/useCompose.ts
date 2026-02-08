export type ComposeState = 'closed' | 'open' | 'minimized' | 'maximized'

interface ComposeData {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  inReplyTo?: string
}

const DRAFT_STORAGE_KEY = 'hourinbox_compose_draft'

const composeState = ref<ComposeState>('closed')
const composeData = reactive<ComposeData>({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
  inReplyTo: undefined
})
const draftSavedAt = ref<Date | null>(null)

// Track source draft for deletion after sending
const draftSource = reactive<{ uid: number, folder: string } | { uid: 0, folder: '' }>({ uid: 0, folder: '' })

// Track the server-side draft UID for replace-on-save
const serverDraftUid = ref(0)
let serverSaveInFlight = false

let urlSyncInitialized = false
let draftSaveTimer: ReturnType<typeof setInterval> | null = null

function hasDraftContent(): boolean {
  return !!(composeData.to || composeData.subject || composeData.body)
}

function saveDraft() {
  if (!import.meta.client) return
  if (!hasDraftContent()) return
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
    to: composeData.to,
    cc: composeData.cc,
    bcc: composeData.bcc,
    subject: composeData.subject,
    body: composeData.body,
    inReplyTo: composeData.inReplyTo,
    savedAt: new Date().toISOString()
  }))
  draftSavedAt.value = new Date()
}

function loadDraft(): boolean {
  if (!import.meta.client) return false
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!stored) return false
    const data = JSON.parse(stored)
    if (!data.to && !data.subject && !data.body) return false
    composeData.to = data.to || ''
    composeData.cc = data.cc || ''
    composeData.bcc = data.bcc || ''
    composeData.subject = data.subject || ''
    composeData.body = data.body || ''
    composeData.inReplyTo = data.inReplyTo
    return true
  } catch { return false }
}

function clearDraft() {
  if (!import.meta.client) return
  localStorage.removeItem(DRAFT_STORAGE_KEY)
  draftSavedAt.value = null
}

function startDraftAutoSave() {
  stopDraftAutoSave()
  draftSaveTimer = setInterval(() => {
    if (composeState.value !== 'closed' && hasDraftContent()) {
      saveDraft()
      saveDraftToServerQuiet()
    }
  }, 2000)
}

function stopDraftAutoSave() {
  if (draftSaveTimer) {
    clearInterval(draftSaveTimer)
    draftSaveTimer = null
  }
}

/** Save draft to IMAP server silently (called by auto-save timer) */
function saveDraftToServerQuiet() {
  if (!import.meta.client || serverSaveInFlight) return
  if (!hasDraftContent()) return
  serverSaveInFlight = true

  $fetch<{ success: boolean, uid: number, folder: string }>('/api/mail/draft', {
    method: 'POST',
    body: {
      to: composeData.to || undefined,
      cc: composeData.cc || undefined,
      bcc: composeData.bcc || undefined,
      subject: composeData.subject || undefined,
      html: composeData.body || undefined,
      replaceUid: serverDraftUid.value || undefined
    }
  }).then((res) => {
    if (res.uid) serverDraftUid.value = res.uid
    draftSavedAt.value = new Date()
    const { fetchFolders, currentFolder, fetchMessages, invalidateFolderCache, folders } = useMail()
    const draftsFolder = folders.value.find(f => f.specialUse === '\\Drafts')
    const draftsPath = draftsFolder?.path || 'Drafts'
    invalidateFolderCache(draftsPath)
    if (currentFolder.value === draftsPath) {
      fetchMessages(draftsPath, 1, true)
    }
    // Refresh folders for accurate server counts
    fetchFolders(true)
  }).catch(() => {
    // Silent fail
  }).finally(() => {
    serverSaveInFlight = false
  })
}

export function useCompose() {
  function openCompose(data?: Partial<ComposeData>, source?: { uid: number, folder: string }) {
    if (data && (data.to || data.subject || data.body)) {
      // Opening with specific data (reply, forward, draft edit, etc.)
      composeData.to = data.to || ''
      composeData.cc = data.cc || ''
      composeData.bcc = data.bcc || ''
      composeData.subject = data.subject || ''
      composeData.body = data.body || ''
      composeData.inReplyTo = data.inReplyTo
    } else {
      // Opening fresh — try to restore saved draft
      const restored = loadDraft()
      if (!restored) {
        composeData.to = ''
        composeData.cc = ''
        composeData.bcc = ''
        composeData.subject = ''
        composeData.body = ''
        composeData.inReplyTo = undefined
      }
    }
    // Track draft source for deletion after sending
    if (source) {
      draftSource.uid = source.uid
      draftSource.folder = source.folder
      // When editing an existing draft, track its UID for replace-on-save
      serverDraftUid.value = source.uid
    } else {
      draftSource.uid = 0
      draftSource.folder = ''
      serverDraftUid.value = 0
    }
    composeState.value = 'open'
    startDraftAutoSave()
  }

  async function saveDraftToServer() {
    if (!import.meta.client) return
    if (!hasDraftContent()) return
    try {
      const res = await $fetch<{ success: boolean, uid: number, folder: string }>('/api/mail/draft', {
        method: 'POST',
        body: {
          to: composeData.to || undefined,
          cc: composeData.cc || undefined,
          bcc: composeData.bcc || undefined,
          subject: composeData.subject || undefined,
          html: composeData.body || undefined,
          replaceUid: serverDraftUid.value || undefined
        }
      })
      if (res.uid) serverDraftUid.value = res.uid
      const { fetchFolders, currentFolder, fetchMessages, invalidateFolderCache, folders } = useMail()
      const draftsFolder = folders.value.find(f => f.specialUse === '\\Drafts')
      const draftsPath = draftsFolder?.path || 'Drafts'
      invalidateFolderCache(draftsPath)
      if (currentFolder.value === draftsPath) {
        fetchMessages(draftsPath, 1, true)
      }
      fetchFolders(true)
    } catch {
      // Silently fail — draft save is best-effort
    }
  }

  async function closeCompose() {
    stopDraftAutoSave()
    // Final save to IMAP Drafts folder if there's content
    if (hasDraftContent()) {
      await saveDraftToServer()
    }
    clearDraft()
    serverDraftUid.value = 0
    draftSource.uid = 0
    draftSource.folder = ''
    composeState.value = 'closed'
    composeData.to = ''
    composeData.cc = ''
    composeData.bcc = ''
    composeData.subject = ''
    composeData.body = ''
    composeData.inReplyTo = undefined
  }

  function discardCompose() {
    stopDraftAutoSave()
    // Delete the server draft if one was saved
    if (serverDraftUid.value) {
      const uidToDelete = serverDraftUid.value
      const { deleteEmail, folders, invalidateFolderCache, fetchFolders } = useMail()
      const draftsFolder = folders.value.find(f => f.specialUse === '\\Drafts')
      const draftsPath = draftsFolder?.path || 'Drafts'
      // deleteEmail already calls adjustFolderCount(-1) optimistically
      deleteEmail(uidToDelete, draftsPath)
      invalidateFolderCache(draftsPath)
      fetchFolders(true)
    }
    clearDraft()
    serverDraftUid.value = 0
    draftSource.uid = 0
    draftSource.folder = ''
    composeState.value = 'closed'
    composeData.to = ''
    composeData.cc = ''
    composeData.bcc = ''
    composeData.subject = ''
    composeData.body = ''
    composeData.inReplyTo = undefined
  }

  function minimizeCompose() {
    composeState.value = 'minimized'
  }

  function maximizeCompose() {
    composeState.value = 'maximized'
  }

  function restoreCompose() {
    composeState.value = 'open'
  }

  function toggleMinimize() {
    composeState.value = composeState.value === 'minimized' ? 'open' : 'minimized'
  }

  function toggleMaximize() {
    composeState.value = composeState.value === 'maximized' ? 'open' : 'maximized'
  }

  function initUrlSync() {
    if (urlSyncInitialized || !import.meta.client) return
    urlSyncInitialized = true

    const router = useRouter()
    const route = useRoute()

    // On initial load: check if ?compose=new is present
    if (route.query.compose === 'new' && composeState.value === 'closed') {
      composeState.value = 'open'
    }

    // Watch compose state → update URL
    watch(composeState, (newState) => {
      const currentQuery = { ...route.query }
      const hasComposeParam = 'compose' in currentQuery

      if (newState !== 'closed' && !hasComposeParam) {
        router.replace({
          path: route.path,
          query: { ...currentQuery, compose: 'new' }
        })
      } else if (newState === 'closed' && hasComposeParam) {
        const { compose: _, ...rest } = currentQuery
        router.replace({
          path: route.path,
          query: Object.keys(rest).length > 0 ? rest : undefined
        })
      }
    })

    // Watch URL changes → update compose state (browser back/forward)
    watch(() => route.query.compose, (newVal, oldVal) => {
      if (newVal === 'new' && composeState.value === 'closed') {
        composeState.value = 'open'
      } else if (!newVal && oldVal === 'new' && composeState.value !== 'closed') {
        composeState.value = 'closed'
        composeData.to = ''
        composeData.cc = ''
        composeData.bcc = ''
        composeData.subject = ''
        composeData.body = ''
        composeData.inReplyTo = undefined
      }
    })
  }

  return {
    composeState: readonly(composeState),
    composeData,
    draftSavedAt: readonly(draftSavedAt),
    draftSource: readonly(draftSource),
    openCompose,
    closeCompose,
    discardCompose,
    minimizeCompose,
    maximizeCompose,
    restoreCompose,
    toggleMinimize,
    toggleMaximize,
    clearDraft,
    initUrlSync
  }
}
