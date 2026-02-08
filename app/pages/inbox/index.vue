<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const {
  messages, totalMessages, loadingMessages, fetchMessages,
  selectedMessages, toggleSelect, selectAll, clearSelection,
  toggleStarred, toggleRead, deleteEmail
} = useMail()
const page = ref(1)

onMounted(() => {
  fetchMessages('INBOX', page.value)
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function senderName(from: { name: string, address: string }[]) {
  if (!from?.length) return '(no sender)'
  return from[0]?.name || from[0]?.address || '(no sender)'
}

function isRead(flags: string[]) {
  return flags?.includes('\\Seen')
}

function isStarred(flags: string[]) {
  return flags?.includes('\\Flagged')
}

const totalPages = computed(() => Math.ceil(totalMessages.value / 50))

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    fetchMessages('INBOX', page.value)
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    fetchMessages('INBOX', page.value)
  }
}

async function handleStarClick(e: Event, uid: number, currentlyStarred: boolean) {
  e.preventDefault()
  e.stopPropagation()
  await toggleStarred(uid, !currentlyStarred, 'INBOX')
}

async function handleCheckboxClick(e: Event, uid: number) {
  e.preventDefault()
  e.stopPropagation()
  toggleSelect(uid)
}

async function bulkDelete() {
  for (const uid of selectedMessages.value) {
    await deleteEmail(uid, 'INBOX')
  }
  clearSelection()
}

async function bulkMarkRead() {
  for (const uid of selectedMessages.value) {
    await toggleRead(uid, true, 'INBOX')
  }
  clearSelection()
}

const allSelected = computed(() =>
  messages.value.length > 0 && selectedMessages.value.size === messages.value.length
)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 sm:px-4 py-1.5 border-b border-default shrink-0">
      <!-- Select all checkbox -->
      <button
        class="w-8 h-8 flex items-center justify-center rounded hover:bg-elevated transition-colors"
        @click="selectAll"
      >
        <UIcon
          :name="allSelected ? 'i-lucide-check-square' : 'i-lucide-square'"
          class="text-base text-muted"
        />
      </button>

      <!-- Bulk actions -->
      <template v-if="selectedMessages.size > 0">
        <UButton
          icon="i-lucide-archive"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Archive"
        />
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Delete"
          @click="bulkDelete"
        />
        <UButton
          icon="i-lucide-mail-open"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Mark as read"
          @click="bulkMarkRead"
        />
        <span class="text-xs text-muted ml-1">{{ selectedMessages.size }} selected</span>
      </template>

      <div class="flex-1" />

      <span
        v-if="totalMessages > 0"
        class="text-xs text-muted hidden sm:inline"
      >
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
        @click="fetchMessages('INBOX', page, true)"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="loadingMessages && messages.length === 0"
      class="flex items-center justify-center flex-1"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-3xl text-primary mb-2"
        />
        <p class="text-muted text-sm">
          Loading messages...
        </p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="messages.length === 0"
      class="flex items-center justify-center flex-1"
    >
      <div class="text-center">
        <UIcon
          name="i-lucide-inbox"
          class="text-5xl text-muted mb-3"
        />
        <h3 class="text-lg font-medium mb-1">
          Your inbox is empty
        </h3>
        <p class="text-muted text-sm">
          No messages to display
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

        <!-- Message content (clickable link) -->
        <NuxtLink
          :to="`/inbox/${encodeMessageId(msg.messageId) || msg.uid}`"
          class="flex items-center gap-2 flex-1 min-w-0 py-2 pr-3"
        >
          <!-- Sender -->
          <span
            class="w-32 sm:w-44 truncate shrink-0 text-sm"
            :class="isRead(msg.flags) ? 'text-muted' : 'font-semibold'"
          >
            {{ senderName(msg.from) }}
          </span>

          <!-- Subject & Preview -->
          <div class="flex-1 min-w-0 flex items-baseline gap-1">
            <span
              class="truncate text-sm"
              :class="isRead(msg.flags) ? 'text-muted' : 'font-medium'"
            >
              {{ msg.subject || '(no subject)' }}
            </span>
            <span
              v-if="msg.preview"
              class="truncate text-xs text-muted hidden md:inline"
            >
              — {{ msg.preview }}
            </span>
          </div>

          <!-- Date -->
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
