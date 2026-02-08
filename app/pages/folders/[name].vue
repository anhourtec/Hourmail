<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const route = useRoute()
const {
  messages, totalMessages, loadingMessages, fetchMessages, folders,
  selectedMessages, toggleSelect, selectAll, clearSelection,
  toggleStarred, deleteEmail, fetchFolders
} = useMail()
const { openCompose } = useCompose()
const folderPath = computed(() => decodeURIComponent(route.params.name as string))
const page = ref(1)
const loadingDraft = ref(false)
const deletingAll = ref(false)

const isDraftsFolder = computed(() => {
  const f = folders.value.find(f => f.path === folderPath.value)
  return f?.specialUse === '\\Drafts'
})

onMounted(() => {
  fetchMessages(folderPath.value, page.value)
})

watch(() => route.params.name, (newName) => {
  if (newName) {
    page.value = 1
    clearSelection()
    fetchMessages(decodeURIComponent(newName as string), 1)
  }
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

function recipientName(to: { name: string, address: string }[]) {
  if (!to?.length) return '(no recipient)'
  const first = to[0]
  return first?.name || first?.address || '(no recipient)'
}

function isRead(flags: string[]) {
  return flags?.includes('\\Seen')
}

function isStarred(flags: string[]) {
  return flags?.includes('\\Flagged')
}

function isDraft(flags: string[]) {
  return flags?.includes('\\Draft')
}

const totalPages = computed(() => Math.ceil(totalMessages.value / 50))

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    fetchMessages(folderPath.value, page.value)
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    fetchMessages(folderPath.value, page.value)
  }
}

async function handleStarClick(e: Event, uid: number, currentlyStarred: boolean) {
  e.preventDefault()
  e.stopPropagation()
  await toggleStarred(uid, !currentlyStarred, folderPath.value)
}

async function handleCheckboxClick(e: Event, uid: number) {
  e.preventDefault()
  e.stopPropagation()
  toggleSelect(uid)
}

async function handleDraftClick(msg: { uid: number; flags: string[] }) {
  loadingDraft.value = true
  try {
    const draft = await $fetch<{ to: string; cc: string; bcc: string; subject: string; html: string }>('/api/mail/draft', {
      query: { uid: msg.uid, folder: folderPath.value }
    })
    openCompose({
      to: draft.to || '',
      cc: draft.cc || '',
      bcc: draft.bcc || '',
      subject: draft.subject || '',
      body: draft.html || ''
    }, { uid: msg.uid, folder: folderPath.value })
  } finally {
    loadingDraft.value = false
  }
}

function handleDeleteDraft(e: Event, uid: number) {
  e.preventDefault()
  e.stopPropagation()
  deleteEmail(uid, folderPath.value)
  fetchFolders(true)
}

function handleDeleteSelectedDrafts() {
  const uids = [...selectedMessages.value]
  for (const uid of uids) {
    deleteEmail(uid, folderPath.value)
  }
  clearSelection()
  fetchFolders(true)
}

function folderDisplayName(path: string) {
  if (path === 'INBOX') return 'Inbox'
  const parts = path.split('/')
  return parts[parts.length - 1]
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

      <h2 class="text-sm font-semibold ml-1">{{ folderDisplayName(folderPath) }}</h2>

      <UButton
        v-if="isDraftsFolder && selectedMessages.size > 0"
        :label="selectedMessages.size === messages.length ? 'Discard all' : `Discard (${selectedMessages.size})`"
        icon="i-lucide-trash-2"
        variant="soft"
        color="error"
        size="xs"
        class="ml-2"
        :loading="deletingAll"
        @click="handleDeleteSelectedDrafts"
      />

      <div class="flex-1" />

      <span v-if="totalMessages > 0" class="text-xs text-muted hidden sm:inline">
        {{ (page - 1) * 50 + 1 }}&ndash;{{ Math.min(page * 50, totalMessages) }} of {{ totalMessages }}
      </span>

      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        color="neutral"
        size="xs"
        :disabled="page <= 1"
        @click="prevPage"
      />
      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        color="neutral"
        size="xs"
        :disabled="page >= totalPages"
        @click="nextPage"
      />

      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        color="neutral"
        size="xs"
        :loading="loadingMessages"
        @click="fetchMessages(folderPath, page, true)"
      />
    </div>

    <!-- Loading -->
    <div v-if="loadingMessages && messages.length === 0" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary mb-2" />
        <p class="text-muted text-sm">Loading messages...</p>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="messages.length === 0" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <UIcon name="i-lucide-folder-open" class="text-5xl text-muted mb-3" />
        <h3 class="text-lg font-medium mb-1">No messages</h3>
        <p class="text-muted text-sm">This folder is empty</p>
      </div>
    </div>

    <!-- Loading draft overlay -->
    <div v-if="loadingDraft" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary mb-2" />
        <p class="text-muted text-sm">Opening draft...</p>
      </div>
    </div>

    <!-- Message List -->
    <div v-else class="flex-1 overflow-y-auto">
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

        <!-- Star -->
        <button
          class="w-8 flex items-center justify-center shrink-0"
          @click="handleStarClick($event, msg.uid, isStarred(msg.flags))"
        >
          <UIcon
            name="i-lucide-star"
            class="text-sm transition-colors"
            :class="isStarred(msg.flags) ? 'text-yellow-500' : 'text-muted hover:text-yellow-400'"
          />
        </button>

        <!-- Message content: drafts open compose, others navigate to detail -->
        <NuxtLink
          v-if="!isDraft(msg.flags)"
          :to="`/inbox/${encodeMessageId(msg.messageId) || msg.uid}?folder=${encodeURIComponent(folderPath)}`"
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

        <!-- Draft: click opens compose -->
        <button
          v-else
          type="button"
          class="flex items-center gap-2 flex-1 min-w-0 py-2 pr-3 text-left"
          @click="handleDraftClick(msg)"
        >
          <span class="w-32 sm:w-44 truncate shrink-0 text-sm">
            <span class="text-red-500 font-medium">Draft</span>
            <span class="text-muted ml-1">to {{ recipientName(msg.to) }}</span>
          </span>

          <div class="flex-1 min-w-0 flex items-baseline gap-1">
            <span class="truncate text-sm text-muted">
              {{ msg.subject || '(no subject)' }}
            </span>
          </div>

          <span class="text-xs shrink-0 tabular-nums text-muted">
            {{ formatDate(msg.date) }}
          </span>
        </button>

        <!-- Delete button for drafts -->
        <button
          v-if="isDraft(msg.flags)"
          class="w-8 h-8 flex items-center justify-center shrink-0 text-muted hover:text-red-500 transition-colors"
          title="Delete draft"
          @click="handleDeleteDraft($event, msg.uid)"
        >
          <UIcon name="i-lucide-x" class="text-sm" />
        </button>
      </div>
    </div>
  </div>
</template>
