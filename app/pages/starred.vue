<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const { messages, totalMessages, selectedMessages, toggleSelect, selectAll, toggleStarred } = useMail()
const loading = ref(false)

type StarredResult = { messages: { uid: number, seq: number, messageId?: string, subject: string, from: { name: string, address: string }[], to: { name: string, address: string }[], date: string, flags: string[], preview: string }[], total: number }

const STARRED_CACHE_KEY = 'hourmail_starred_cache'

// Track removed UIDs so background refresh doesn't re-add them
const removedUids = new Set<number>()
let bgAbort: AbortController | null = null

function getCachedStarred(): StarredResult | null {
  try {
    const stored = sessionStorage.getItem(STARRED_CACHE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (Date.now() - parsed._ts > 120000) return null
    return parsed
  } catch { return null }
}

function setCachedStarred(data: StarredResult) {
  try {
    sessionStorage.setItem(STARRED_CACHE_KEY, JSON.stringify({ ...data, _ts: Date.now() }))
  } catch { /* ignore */ }
}

async function fetchStarred() {
  // Cancel any previous background refresh
  bgAbort?.abort()
  bgAbort = null

  const cached = getCachedStarred()
  if (cached) {
    // Filter out any UIDs we've already removed this session
    const filtered = cached.messages.filter(m => !removedUids.has(m.uid))
    messages.value = filtered
    totalMessages.value = filtered.length

    // Background refresh with abort support
    const controller = new AbortController()
    bgAbort = controller
    $fetch<StarredResult>('/api/mail/starred', { signal: controller.signal }).then((data) => {
      // Filter out locally-removed UIDs from server response
      const fresh = data.messages.filter(m => !removedUids.has(m.uid))
      messages.value = fresh
      totalMessages.value = fresh.length
      setCachedStarred({ messages: fresh, total: fresh.length })
      bgAbort = null
    }).catch(() => {})
    return
  }

  loading.value = true
  try {
    const data = await $fetch<StarredResult>('/api/mail/starred')
    const filtered = data.messages.filter(m => !removedUids.has(m.uid))
    messages.value = filtered
    totalMessages.value = filtered.length
    setCachedStarred({ messages: filtered, total: filtered.length })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStarred()
})

onUnmounted(() => {
  bgAbort?.abort()
  removedUids.clear()
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function senderName(from: { name: string, address: string }[]) {
  if (!from?.length) return '(no sender)'
  return from[0]?.name || from[0]?.address || '(no sender)'
}

function isRead(flags: string[]) {
  return flags?.includes('\\Seen')
}

function handleStarClick(e: Event, uid: number) {
  e.preventDefault()
  e.stopPropagation()

  // Cancel any in-flight background refresh so it can't overwrite our removal
  bgAbort?.abort()
  bgAbort = null

  // Track this UID so no future fetch can re-add it
  removedUids.add(uid)

  // Instant removal from list
  messages.value = messages.value.filter(m => m.uid !== uid)
  totalMessages.value = Math.max(0, totalMessages.value - 1)

  // Update sessionStorage cache to match
  setCachedStarred({ messages: messages.value, total: totalMessages.value })

  // Fire IMAP flag update in background
  toggleStarred(uid, false, 'INBOX')
}

function handleCheckboxClick(e: Event, uid: number) {
  e.preventDefault()
  e.stopPropagation()
  toggleSelect(uid)
}

const allSelected = computed(() =>
  messages.value.length > 0 && selectedMessages.value.size === messages.value.length
)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 sm:px-4 py-1.5 border-b border-default shrink-0">
      <button
        class="w-8 h-8 flex items-center justify-center rounded hover:bg-elevated transition-colors"
        @click="selectAll"
      >
        <UIcon
          :name="allSelected ? 'i-lucide-check-square' : 'i-lucide-square'"
          class="text-base text-muted"
        />
      </button>

      <UIcon
        name="i-lucide-star"
        class="text-yellow-500 text-base ml-1"
      />
      <h2 class="text-sm font-semibold ml-1">
        Starred
      </h2>

      <div class="flex-1" />

      <span
        v-if="totalMessages > 0"
        class="text-xs text-muted hidden sm:inline"
      >
        {{ totalMessages }} starred
      </span>

      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        color="neutral"
        size="xs"
        :loading="loading"
        @click="fetchStarred"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="loading && messages.length === 0"
      class="flex items-center justify-center flex-1"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-3xl text-primary mb-2"
        />
        <p class="text-muted text-sm">
          Loading starred messages...
        </p>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="messages.length === 0"
      class="flex items-center justify-center flex-1"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-star"
          class="text-5xl text-muted mb-3"
        />
        <h3 class="text-lg font-medium mb-1">
          No starred messages
        </h3>
        <p class="text-muted text-sm">
          Star important emails to find them here
        </p>
      </div>
    </div>

    <!-- Message List -->
    <div
      v-else
      class="flex-1 overflow-y-auto"
    >
      <div
        v-for="msg in messages"
        :key="msg.uid"
        class="group flex items-center border-b border-default hover:shadow-sm transition-all cursor-pointer"
        :class="[
          isRead(msg.flags) ? 'bg-default' : 'bg-primary/[0.03]',
          selectedMessages.has(msg.uid) ? 'bg-primary/10' : ''
        ]"
      >
        <!-- Checkbox -->
        <button
          class="w-10 h-full flex items-center justify-center shrink-0"
          @click="handleCheckboxClick($event, msg.uid)"
        >
          <UIcon
            :name="selectedMessages.has(msg.uid) ? 'i-lucide-check-square' : 'i-lucide-square'"
            class="text-sm text-muted"
          />
        </button>

        <!-- Star (always filled since these are starred) -->
        <button
          class="w-8 flex items-center justify-center shrink-0"
          @click="handleStarClick($event, msg.uid)"
        >
          <UIcon
            name="i-lucide-star"
            class="text-sm text-yellow-500 hover:text-yellow-300 transition-colors"
          />
        </button>

        <!-- Message content -->
        <NuxtLink
          :to="`/inbox/${encodeMessageId(msg.messageId) || msg.uid}`"
          class="flex items-center gap-2 flex-1 min-w-0 py-2 pr-3"
        >
          <span
            class="w-32 sm:w-44 truncate shrink-0 text-sm"
            :class="isRead(msg.flags) ? 'text-muted' : 'font-semibold'"
          >
            {{ senderName(msg.from) }}
          </span>

          <div class="flex-1 min-w-0 flex items-baseline gap-1">
            <span
              class="truncate text-sm"
              :class="isRead(msg.flags) ? 'text-muted' : 'font-medium'"
            >
              {{ msg.subject || '(no subject)' }}
            </span>
          </div>

          <span
            class="text-xs shrink-0 tabular-nums"
            :class="isRead(msg.flags) ? 'text-muted' : 'font-medium'"
          >
            {{ formatDate(msg.date) }}
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
