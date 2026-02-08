<script setup lang="ts">
const { brand } = useAppConfig()
const { user, accounts, logout, switchAccount, switchingAccount, fetchAccounts } = useAuth()
const { folders, loadingFolders, fetchFolders, currentFolder, searchMailMessages, clearSearch, searchActive, searchLoading, preloadAllFolders } = useMail()
const { openCompose, initUrlSync } = useCompose()
const { loadSettings } = useSettings()
const { startPolling, stopPolling } = useNotifications()
const { pendingCount: outboxCount } = useOutbox()
initUrlSync()
const route = useRoute()
const sidebarOpen = ref(true)
const mobileSidebarOpen = ref(false)
const searchQuery = ref('')
const searchFocused = ref(false)
const showSearchFilters = ref(false)
const searchFilters = reactive({
  from: '',
  to: '',
  subject: '',
  hasWords: '',
  doesntHave: '',
  size: '',
  sizeUnit: 'MB',
  sizeComparator: 'greater',
  dateWithin: '',
  datePeriod: '1 day'
})

// Recent searches (persisted in localStorage)
const MAX_RECENT = 5
const recentSearches = ref<string[]>([])

function loadRecentSearches() {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem('hourinbox_recent_searches')
      if (stored) recentSearches.value = JSON.parse(stored)
    } catch { /* ignore */ }
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return
  const trimmed = query.trim()
  recentSearches.value = [trimmed, ...recentSearches.value.filter(s => s !== trimmed)].slice(0, MAX_RECENT)
  if (import.meta.client) {
    localStorage.setItem('hourinbox_recent_searches', JSON.stringify(recentSearches.value))
  }
}

function clearRecentSearches() {
  recentSearches.value = []
  if (import.meta.client) {
    localStorage.removeItem('hourinbox_recent_searches')
  }
}

function resetFilters() {
  searchFilters.from = ''
  searchFilters.to = ''
  searchFilters.subject = ''
  searchFilters.hasWords = ''
  searchFilters.doesntHave = ''
  searchFilters.size = ''
  searchFilters.sizeUnit = 'MB'
  searchFilters.sizeComparator = 'greater'
  searchFilters.dateWithin = ''
  searchFilters.datePeriod = '1 day'
}

// Current folder display name for suggestions
const currentFolderName = computed(() => {
  const f = folders.value.find(f => f.path === currentFolder.value)
  if (!f) return currentFolder.value === 'INBOX' ? 'Inbox' : currentFolder.value
  return folderDisplayName(f)
})

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Auto-search as user types (debounced 400ms, min 2 chars)
watch(searchQuery, (newVal) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  const trimmed = newVal.trim()

  // If cleared and search was active, reset
  if (!trimmed && searchActive.value) {
    handleClearSearch()
    return
  }

  // Need at least 2 chars to auto-search
  if (trimmed.length < 2) return

  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    executeSearch()
  }, 400)
})

function executeSearch() {
  // Cancel any pending debounce timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  const query: Record<string, string | number> = {}

  // Parse prefix queries for targeted IMAP fields (FROM/TO/SUBJECT are indexed and much faster than BODY)
  if (searchQuery.value.trim()) {
    let remaining = searchQuery.value.trim()

    const fromMatch = remaining.match(/\bfrom:(\S+)/i)
    if (fromMatch?.[1]) {
      query.from = fromMatch[1]
      remaining = remaining.replace(fromMatch[0], '').trim()
    }

    const toMatch = remaining.match(/\bto:(\S+)/i)
    if (toMatch?.[1]) {
      query.to = toMatch[1]
      remaining = remaining.replace(toMatch[0], '').trim()
    }

    const subjectMatch = remaining.match(/\bsubject:(.+?)(?=\s+\w+:|$)/i)
    if (subjectMatch?.[1]) {
      query.subject = subjectMatch[1].trim()
      remaining = remaining.replace(subjectMatch[0], '').trim()
    }

    if (remaining) query.q = remaining
  }

  // Advanced filters (override prefix-parsed values)
  if (searchFilters.from) query.from = searchFilters.from
  if (searchFilters.to) query.to = searchFilters.to
  if (searchFilters.subject) query.subject = searchFilters.subject
  if (searchFilters.hasWords) {
    query.q = query.q ? `${query.q} ${searchFilters.hasWords}` : searchFilters.hasWords
  }

  // Size filter
  if (searchFilters.size) {
    let bytes = parseInt(searchFilters.size)
    if (searchFilters.sizeUnit === 'KB') bytes *= 1024
    else if (searchFilters.sizeUnit === 'MB') bytes *= 1024 * 1024
    if (searchFilters.sizeComparator === 'greater') query.larger = bytes
    else query.smaller = bytes
  }

  // Date filter
  if (searchFilters.dateWithin) {
    const refDate = new Date(searchFilters.dateWithin)
    const periodDays: Record<string, number> = {
      '1 day': 1, '3 days': 3, '1 week': 7, '2 weeks': 14,
      '1 month': 30, '3 months': 90, '6 months': 180, '1 year': 365
    }
    const days = periodDays[searchFilters.datePeriod] || 1
    const since = new Date(refDate.getTime() - days * 86400000)
    const before = new Date(refDate.getTime() + days * 86400000)
    query.since = since.toISOString().split('T')[0] ?? ''
    query.before = before.toISOString().split('T')[0] ?? ''
  }

  if (Object.keys(query).length === 0) return

  // Save to recent
  const displayQuery = searchQuery.value.trim() || Object.values(searchFilters).filter(Boolean).join(' ')
  saveRecentSearch(displayQuery)

  searchMailMessages({ ...query, folder: currentFolder.value })
  showSearchFilters.value = false
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    // Immediate search on Enter (cancels debounce)
    executeSearch()
  } else if (e.key === 'Escape') {
    if (searchActive.value) {
      handleClearSearch()
    }
    searchFocused.value = false
    ;(e.target as HTMLInputElement)?.blur()
  }
}

function handleClearSearch() {
  searchQuery.value = ''
  resetFilters()
  clearSearch()
  searchFocused.value = false
}

function useRecentSearch(query: string) {
  searchQuery.value = query
  searchFocused.value = false
  searchMailMessages({ q: query, folder: currentFolder.value })
}

const showDropdown = computed(() => {
  return searchFocused.value && !showSearchFilters.value && !searchActive.value
})

const showAccountMenu = ref(false)

onMounted(() => {
  fetchFolders()
  fetchAccounts()
  loadRecentSearches()
  if (user.value?.email) {
    loadSettings(user.value.email)
    startPolling()
  }
})

// Preload all folder messages once folders are available
watch(folders, (list) => {
  if (list.length > 0) preloadAllFolders()
}, { immediate: true })

onUnmounted(() => {
  stopPolling()
})

const folderIcon = (specialUse?: string) => {
  switch (specialUse) {
    case '\\Sent': return 'i-lucide-send'
    case '\\Drafts': return 'i-lucide-file-edit'
    case '\\Trash': return 'i-lucide-trash-2'
    case '\\Junk': return 'i-lucide-shield-alert'
    case '\\All': return 'i-lucide-archive'
    case '\\Flagged': return 'i-lucide-star'
    default: return 'i-lucide-folder'
  }
}

function folderDisplayName(folder: { name: string, specialUse?: string }) {
  if (folder.name === 'INBOX') return 'Inbox'
  return folder.name
}

function folderCount(folder: { path: string, specialUse?: string, messages: number, unseen: number }): number {
  // Inbox: show unread count
  if (folder.path === 'INBOX') return folder.unseen
  // Drafts: show total count
  if (folder.specialUse === '\\Drafts') return folder.messages
  // All other folders: show total message count
  return folder.messages
}

function navigateToFolder(path: string) {
  mobileSidebarOpen.value = false
  navigateTo(path === 'INBOX' ? '/inbox' : `/folders/${encodeURIComponent(path)}`)
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-default">
    <!-- Mobile overlay -->
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
      @click="mobileSidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="hidden lg:flex flex-col bg-elevated z-50 shrink-0"
      :class="sidebarOpen ? 'w-64' : 'w-16'"
    >
      <!-- Logo -->
      <div
        class="shrink-0"
        :class="sidebarOpen ? 'px-5 pt-5 pb-3' : 'px-3 pt-5 pb-3'"
      >
        <NuxtLink
          to="/inbox"
          class="flex items-center"
          :class="sidebarOpen ? 'gap-0.5' : 'justify-center'"
        >
          <img
            :src="brand.logo"
            :alt="brand.name"
            class="shrink-0"
            :class="sidebarOpen ? 'w-12 h-12' : 'w-10 h-10'"
          >
          <span
            v-if="sidebarOpen"
            class="font-bold text-lg tracking-tight"
          >{{ brand.name }}</span>
        </NuxtLink>
      </div>

      <!-- Compose -->
      <div
        class="shrink-0"
        :class="sidebarOpen ? 'px-3 pb-3' : 'px-2 pb-3'"
      >
        <UButton
          v-if="sidebarOpen"
          icon="i-lucide-plus"
          label="Compose"
          block
          size="lg"
          @click="openCompose()"
        />
        <UButton
          v-else
          icon="i-lucide-plus"
          size="lg"
          class="w-full flex justify-center"
          @click="openCompose()"
        />
      </div>

      <!-- Folders -->
      <nav
        class="flex-1 overflow-y-auto py-1"
        :class="sidebarOpen ? 'px-3' : 'px-2'"
      >
        <!-- Starred virtual folder -->
        <button
          v-if="sidebarOpen"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left mb-1"
          :class="
            route.path === '/starred'
              ? 'bg-primary text-white font-medium'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          @click="navigateTo('/starred')"
        >
          <UIcon
            name="i-lucide-star"
            class="text-base shrink-0"
          />
          <span class="truncate flex-1">Starred</span>
        </button>
        <button
          v-else
          class="w-full flex items-center justify-center p-2.5 rounded-md relative mb-1"
          :class="
            route.path === '/starred'
              ? 'bg-primary text-white'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          title="Starred"
          @click="navigateTo('/starred')"
        >
          <UIcon
            name="i-lucide-star"
            class="text-lg shrink-0"
          />
        </button>

        <!-- Contacts -->
        <button
          v-if="sidebarOpen"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left mb-1"
          :class="
            route.path === '/contacts'
              ? 'bg-primary text-white font-medium'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          @click="navigateTo('/contacts')"
        >
          <UIcon
            name="i-lucide-contact"
            class="text-base shrink-0"
          />
          <span class="truncate flex-1">Contacts</span>
        </button>
        <button
          v-else
          class="w-full flex items-center justify-center p-2.5 rounded-md relative mb-1"
          :class="
            route.path === '/contacts'
              ? 'bg-primary text-white'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          title="Contacts"
          @click="navigateTo('/contacts')"
        >
          <UIcon
            name="i-lucide-contact"
            class="text-lg shrink-0"
          />
        </button>

        <p
          v-if="sidebarOpen"
          class="text-[11px] font-semibold uppercase tracking-wider text-muted px-3 mb-2"
        >
          Folders
        </p>

        <div
          v-if="loadingFolders"
          class="flex justify-center p-4"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-muted"
          />
        </div>

        <ul
          v-else
          class="space-y-0.5"
        >
          <template
            v-for="folder in folders"
            :key="folder.path"
          >
            <!-- Outbox before Trash -->
            <li v-if="folder.specialUse === '\\Trash'">
              <button
                v-if="sidebarOpen"
                class="group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left"
                :class="
                  route.path === '/outbox'
                    ? 'bg-primary text-white font-medium'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                @click="navigateTo('/outbox')"
              >
                <UIcon
                  name="i-lucide-package"
                  class="text-base shrink-0"
                />
                <span class="truncate flex-1">Outbox</span>
                <span
                  v-if="outboxCount > 0"
                  class="text-[11px] font-semibold tabular-nums rounded-full min-w-5 text-center py-0.5 px-1.5"
                  :class="
                    route.path === '/outbox'
                      ? 'bg-white/20'
                      : 'bg-primary/10 text-primary'
                  "
                >
                  {{ outboxCount }}
                </span>
              </button>
              <button
                v-else
                class="group w-full flex items-center justify-center p-2.5 rounded-md relative"
                :class="
                  route.path === '/outbox'
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                title="Outbox"
                @click="navigateTo('/outbox')"
              >
                <UIcon
                  name="i-lucide-package"
                  class="text-lg shrink-0"
                />
                <span
                  v-if="outboxCount > 0"
                  class="absolute -top-0.5 -right-0.5 text-[9px] font-bold tabular-nums rounded-full min-w-4 text-center py-0 px-1 bg-primary text-white"
                >
                  {{ outboxCount }}
                </span>
              </button>
            </li>

            <li>
              <!-- Expanded folder button -->
              <button
                v-if="sidebarOpen"
                class="group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left"
                :class="
                  currentFolder === folder.path
                    ? 'bg-primary text-white font-medium'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                @click="navigateToFolder(folder.path)"
              >
                <UIcon
                  :name="folderIcon(folder.specialUse)"
                  class="text-base shrink-0"
                />
                <span class="truncate flex-1">{{ folderDisplayName(folder) }}</span>
                <span
                  v-if="folderCount(folder) > 0"
                  class="text-[11px] font-semibold tabular-nums rounded-full min-w-5 text-center py-0.5 px-1.5"
                  :class="
                    currentFolder === folder.path
                      ? 'bg-white/20'
                      : 'bg-primary/10 text-primary'
                  "
                >
                  {{ folderCount(folder) }}
                </span>
              </button>

              <!-- Collapsed icon-only button -->
              <button
                v-else
                class="group w-full flex items-center justify-center p-2.5 rounded-md relative"
                :class="
                  currentFolder === folder.path
                    ? 'bg-primary text-white'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                :title="folderDisplayName(folder)"
                @click="navigateToFolder(folder.path)"
              >
                <UIcon
                  :name="folderIcon(folder.specialUse)"
                  class="text-lg shrink-0"
                />
                <span
                  v-if="folderCount(folder) > 0"
                  class="absolute -top-0.5 -right-0.5 text-[9px] font-bold tabular-nums rounded-full min-w-4 text-center py-0 px-1 bg-primary text-white"
                >
                  {{ folderCount(folder) }}
                </span>
              </button>
            </li>
          </template>
        </ul>
      </nav>

      <!-- User & Account Switcher -->
      <div
        class="shrink-0 relative"
        :class="sidebarOpen ? 'px-3 mb-3' : 'px-2 pb-3'"
      >
        <!-- Account menu popup -->
        <div
          v-if="showAccountMenu"
          class="absolute bottom-full left-0 right-0 mb-1 bg-elevated rounded-xl shadow-xl border border-default z-50 overflow-hidden"
          :class="sidebarOpen ? 'mx-3' : 'mx-1'"
        >
          <div class="px-3 py-2 border-b border-default">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Accounts
            </p>
          </div>
          <div class="py-1">
            <button
              v-for="account in accounts"
              :key="account.email"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-default transition-colors"
              :class="account.active ? 'bg-primary/5' : ''"
              @click="switchAccount(account.email); showAccountMenu = false"
            >
              <UAvatar
                :alt="account.email"
                size="xs"
              />
              <div class="flex-1 min-w-0">
                <p
                  class="text-xs font-medium truncate"
                  :class="account.active ? 'text-primary' : ''"
                >
                  {{ account.email }}
                </p>
                <p class="text-[11px] text-muted truncate">
                  {{ account.organization }}
                </p>
              </div>
              <UIcon
                v-if="account.active"
                name="i-lucide-check"
                class="text-primary text-sm shrink-0"
              />
            </button>
          </div>
          <div class="border-t border-default py-1">
            <NuxtLink
              to="/login?addAccount=true"
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-default transition-colors text-sm text-muted"
              @click="showAccountMenu = false"
            >
              <UIcon
                name="i-lucide-plus"
                class="text-sm"
              />
              <span>Add account</span>
            </NuxtLink>
            <button
              class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-default transition-colors text-sm text-red-500"
              @click="logout(); showAccountMenu = false"
            >
              <UIcon
                name="i-lucide-log-out"
                class="text-sm"
              />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <!-- Overlay to close account menu -->
        <div
          v-if="showAccountMenu"
          class="fixed inset-0 z-40"
          @click="showAccountMenu = false"
        />

        <!-- Loading overlay during switch -->
        <div
          v-if="switchingAccount"
          class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center"
        >
          <div class="bg-elevated rounded-xl p-6 shadow-xl text-center">
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin text-2xl text-primary mb-2"
            />
            <p class="text-sm text-muted">
              Switching account...
            </p>
          </div>
        </div>

        <div
          v-if="sidebarOpen"
          class="p-3 rounded-lg bg-default"
        >
          <button
            class="w-full flex items-center gap-2.5 text-left"
            @click="showAccountMenu = !showAccountMenu"
          >
            <UAvatar
              :alt="user?.email || ''"
              size="xs"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium truncate">
                {{ user?.email }}
              </p>
              <p class="text-[11px] text-muted truncate">
                {{ user?.organization }}
              </p>
            </div>
            <UIcon
              name="i-lucide-chevrons-up-down"
              class="text-sm text-muted shrink-0"
            />
          </button>
        </div>
        <div
          v-else
          class="flex flex-col items-center gap-2"
        >
          <button @click="showAccountMenu = !showAccountMenu">
            <UAvatar
              :alt="user?.email || ''"
              size="xs"
            />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile sidebar (always full width) -->
    <aside
      v-if="mobileSidebarOpen"
      class="fixed inset-y-0 left-0 w-64 flex flex-col bg-elevated z-50 shadow-2xl lg:hidden"
    >
      <div class="px-5 pt-5 pb-3">
        <NuxtLink
          to="/inbox"
          class="flex items-center gap-0.5"
        >
          <img
            :src="brand.logo"
            :alt="brand.name"
            class="w-12 h-12 shrink-0"
          >
          <span class="font-bold text-lg tracking-tight">{{ brand.name }}</span>
        </NuxtLink>
      </div>

      <div class="px-3 pb-3">
        <UButton
          icon="i-lucide-plus"
          label="Compose"
          block
          size="lg"
          @click="mobileSidebarOpen = false; openCompose()"
        />
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-1">
        <!-- Starred virtual folder -->
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left mb-1"
          :class="
            route.path === '/starred'
              ? 'bg-primary text-white font-medium'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          @click="mobileSidebarOpen = false; navigateTo('/starred')"
        >
          <UIcon
            name="i-lucide-star"
            class="text-base shrink-0"
          />
          <span class="truncate flex-1">Starred</span>
        </button>

        <!-- Contacts -->
        <button
          class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left mb-1"
          :class="
            route.path === '/contacts'
              ? 'bg-primary text-white font-medium'
              : 'text-muted hover:bg-default hover:text-foreground'
          "
          @click="mobileSidebarOpen = false; navigateTo('/contacts')"
        >
          <UIcon
            name="i-lucide-contact"
            class="text-base shrink-0"
          />
          <span class="truncate flex-1">Contacts</span>
        </button>

        <p class="text-[11px] font-semibold uppercase tracking-wider text-muted px-3 mb-2">
          Folders
        </p>

        <div
          v-if="loadingFolders"
          class="flex justify-center p-4"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-muted"
          />
        </div>

        <ul
          v-else
          class="space-y-0.5"
        >
          <template
            v-for="folder in folders"
            :key="folder.path"
          >
            <!-- Outbox before Trash -->
            <li v-if="folder.specialUse === '\\Trash'">
              <button
                class="group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left"
                :class="
                  route.path === '/outbox'
                    ? 'bg-primary text-white font-medium'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                @click="mobileSidebarOpen = false; navigateTo('/outbox')"
              >
                <UIcon
                  name="i-lucide-package"
                  class="text-base shrink-0"
                />
                <span class="truncate flex-1">Outbox</span>
                <span
                  v-if="outboxCount > 0"
                  class="text-[11px] font-semibold tabular-nums rounded-full min-w-5 text-center py-0.5 px-1.5"
                  :class="
                    route.path === '/outbox'
                      ? 'bg-white/20'
                      : 'bg-primary/10 text-primary'
                  "
                >
                  {{ outboxCount }}
                </span>
              </button>
            </li>

            <li>
              <button
                class="group w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left"
                :class="
                  currentFolder === folder.path
                    ? 'bg-primary text-white font-medium'
                    : 'text-muted hover:bg-default hover:text-foreground'
                "
                @click="navigateToFolder(folder.path)"
              >
                <UIcon
                  :name="folderIcon(folder.specialUse)"
                  class="text-base shrink-0"
                />
                <span class="truncate flex-1">{{ folderDisplayName(folder) }}</span>
                <span
                  v-if="folderCount(folder) > 0"
                  class="text-[11px] font-semibold tabular-nums rounded-full min-w-5 text-center py-0.5 px-1.5"
                  :class="
                    currentFolder === folder.path
                      ? 'bg-white/20'
                      : 'bg-primary/10 text-primary'
                  "
                >
                  {{ folderCount(folder) }}
                </span>
              </button>
            </li>
          </template>
        </ul>
      </nav>

      <div class="px-3 mb-3">
        <!-- Mobile account list -->
        <div
          v-if="accounts.length > 1"
          class="mb-2"
        >
          <button
            v-for="account in accounts"
            :key="account.email"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors"
            :class="account.active ? 'bg-primary/10' : 'hover:bg-default'"
            @click="switchAccount(account.email); mobileSidebarOpen = false"
          >
            <UAvatar
              :alt="account.email"
              size="xs"
            />
            <div class="flex-1 min-w-0">
              <p
                class="text-xs font-medium truncate"
                :class="account.active ? 'text-primary' : ''"
              >
                {{ account.email }}
              </p>
            </div>
            <UIcon
              v-if="account.active"
              name="i-lucide-check"
              class="text-primary text-sm shrink-0"
            />
          </button>
        </div>

        <div class="p-3 rounded-lg bg-default">
          <div class="flex items-center gap-2.5">
            <UAvatar
              :alt="user?.email || ''"
              size="xs"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium truncate">
                {{ user?.email }}
              </p>
              <p class="text-[11px] text-muted truncate">
                {{ user?.organization }}
              </p>
            </div>
            <div class="flex items-center gap-0.5">
              <NuxtLink
                to="/login?addAccount=true"
                class="p-1.5 rounded hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                title="Add account"
                @click="mobileSidebarOpen = false"
              >
                <UIcon
                  name="i-lucide-plus"
                  class="text-sm"
                />
              </NuxtLink>
              <button
                class="p-1.5 rounded hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                title="Sign out"
                @click="logout"
              >
                <UIcon
                  name="i-lucide-log-out"
                  class="text-sm"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header -->
      <header class="flex items-center gap-2 px-4 py-2.5 border-b border-default shrink-0">
        <!-- Mobile menu -->
        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          color="neutral"
          size="sm"
          class="lg:hidden"
          @click="mobileSidebarOpen = !mobileSidebarOpen"
        />
        <!-- Desktop sidebar toggle -->
        <UButton
          :icon="sidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          variant="ghost"
          color="neutral"
          size="sm"
          class="hidden lg:flex"
          @click="sidebarOpen = !sidebarOpen"
        />

        <!-- Search bar -->
        <div class="flex-1 max-w-2xl mx-auto relative">
          <div
            class="flex items-center bg-elevated rounded-full"
            :class="searchActive ? 'ring-1 ring-primary' : ''"
          >
            <UIcon
              :name="searchLoading ? 'i-lucide-loader-2' : 'i-lucide-search'"
              class="ml-3.5 shrink-0"
              :class="searchLoading ? 'animate-spin text-primary' : 'text-muted'"
            />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="`Search in ${currentFolderName}`"
              class="flex-1 bg-transparent border-0 outline-none text-sm py-2 px-3"
              @focus="searchFocused = true"
              @keydown="handleSearchKeydown"
            >
            <!-- Clear search button (when search is active) -->
            <button
              v-if="searchActive"
              type="button"
              class="p-2 mr-0.5 rounded-full hover:bg-default text-muted hover:text-highlighted"
              title="Clear search"
              @click="handleClearSearch"
            >
              <UIcon
                name="i-lucide-x"
                class="text-sm"
              />
            </button>
            <button
              type="button"
              class="p-2 mr-1 rounded-full hover:bg-default text-muted"
              title="Show search options"
              @click="showSearchFilters = !showSearchFilters; searchFocused = false"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
              </svg>
            </button>
          </div>

          <!-- Suggestions & recent searches dropdown -->
          <div
            v-if="showDropdown"
            class="absolute top-full left-0 right-0 mt-2 bg-elevated rounded-xl shadow-xl border border-default z-50 py-2 overflow-hidden"
          >
            <!-- Folder context -->
            <div class="px-4 py-2 text-xs text-muted">
              <UIcon
                name="i-lucide-search"
                class="text-[10px] mr-1"
              />
              Searching in <strong class="text-highlighted">{{ currentFolderName }}</strong>
            </div>

            <!-- Quick suggestions -->
            <div class="px-2">
              <button
                class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-default text-sm text-left"
                @mousedown.prevent="searchQuery = `from:`; searchFocused = true"
              >
                <UIcon
                  name="i-lucide-user"
                  class="text-muted text-xs"
                />
                <span class="text-muted">from:</span>
                <span class="text-xs text-muted ml-auto">Search by sender</span>
              </button>
              <button
                class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-default text-sm text-left"
                @mousedown.prevent="searchQuery = `subject:`; searchFocused = true"
              >
                <UIcon
                  name="i-lucide-text"
                  class="text-muted text-xs"
                />
                <span class="text-muted">subject:</span>
                <span class="text-xs text-muted ml-auto">Search by subject</span>
              </button>
              <button
                class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-default text-sm text-left"
                @mousedown.prevent="searchQuery = `to:`; searchFocused = true"
              >
                <UIcon
                  name="i-lucide-at-sign"
                  class="text-muted text-xs"
                />
                <span class="text-muted">to:</span>
                <span class="text-xs text-muted ml-auto">Search by recipient</span>
              </button>
            </div>

            <!-- Recent searches -->
            <template v-if="recentSearches.length > 0">
              <div class="border-t border-default mt-2 pt-2">
                <div class="flex items-center justify-between px-4 py-1">
                  <span class="text-xs text-muted font-medium">Recent searches</span>
                  <button
                    class="text-[11px] text-muted hover:text-highlighted"
                    @mousedown.prevent="clearRecentSearches"
                  >
                    Clear
                  </button>
                </div>
                <div class="px-2">
                  <button
                    v-for="recent in recentSearches"
                    :key="recent"
                    class="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-default text-sm text-left"
                    @mousedown.prevent="useRecentSearch(recent)"
                  >
                    <UIcon
                      name="i-lucide-clock"
                      class="text-muted text-xs shrink-0"
                    />
                    <span class="truncate">{{ recent }}</span>
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Search filters dropdown -->
          <div
            v-if="showSearchFilters"
            class="absolute top-full left-0 right-0 mt-2 bg-elevated rounded-xl shadow-xl border border-default z-50 p-5"
          >
            <div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-center text-sm">
              <label class="text-muted text-right whitespace-nowrap">From</label>
              <input
                v-model="searchFilters.from"
                type="text"
                placeholder=""
                class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >

              <label class="text-muted text-right whitespace-nowrap">To</label>
              <input
                v-model="searchFilters.to"
                type="text"
                placeholder=""
                class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >

              <label class="text-muted text-right whitespace-nowrap">Subject</label>
              <input
                v-model="searchFilters.subject"
                type="text"
                placeholder=""
                class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >

              <label class="text-muted text-right whitespace-nowrap">Includes the words</label>
              <input
                v-model="searchFilters.hasWords"
                type="text"
                placeholder=""
                class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >

              <label class="text-muted text-right whitespace-nowrap">Doesn't have</label>
              <input
                v-model="searchFilters.doesntHave"
                type="text"
                placeholder=""
                class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >

              <label class="text-muted text-right whitespace-nowrap">Size</label>
              <div class="flex items-center gap-2">
                <select
                  v-model="searchFilters.sizeComparator"
                  class="bg-default border border-default rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="greater">
                    greater than
                  </option>
                  <option value="less">
                    less than
                  </option>
                </select>
                <input
                  v-model="searchFilters.size"
                  type="number"
                  placeholder=""
                  class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary w-24"
                >
                <select
                  v-model="searchFilters.sizeUnit"
                  class="bg-default border border-default rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>MB</option>
                  <option>KB</option>
                  <option>Bytes</option>
                </select>
              </div>

              <label class="text-muted text-right whitespace-nowrap">Date within</label>
              <div class="flex items-center gap-2">
                <select
                  v-model="searchFilters.datePeriod"
                  class="bg-default border border-default rounded-md px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>1 day</option>
                  <option>3 days</option>
                  <option>1 week</option>
                  <option>2 weeks</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>1 year</option>
                </select>
                <span class="text-muted">of</span>
                <input
                  v-model="searchFilters.dateWithin"
                  type="date"
                  class="bg-default border border-default rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                >
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-default">
              <UButton
                label="Reset"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="resetFilters"
              />
              <UButton
                label="Search"
                icon="i-lucide-search"
                size="sm"
                @click="executeSearch"
              />
            </div>
          </div>
        </div>

        <!-- Click outside to close filters/dropdown -->
        <div
          v-if="showSearchFilters || showDropdown"
          class="fixed inset-0 z-40"
          @click="showSearchFilters = false; searchFocused = false"
        />

        <div class="flex items-center gap-0.5">
          <UColorModeButton
            size="sm"
            variant="ghost"
          />
          <UButton
            to="/settings"
            icon="i-lucide-settings"
            variant="ghost"
            color="neutral"
            size="sm"
          />
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-hidden">
        <slot />
      </main>
    </div>

    <!-- Compose Modal -->
    <ComposeModal />
  </div>
</template>
