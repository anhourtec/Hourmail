<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const route = useRoute()
const { user } = useAuth()
const { currentMessage, loadingMessage, fetchMessage, toggleRead, toggleStarred, deleteEmail, archiveEmail, sendEmail, messages } = useMail()
const { openCompose } = useCompose()
const toast = useToast()
const idParam = route.params.id as string
const folder = (route.query.folder as string) || 'INBOX'
const showDetails = ref(false)
const uid = ref(0)

// Inline reply state
const replyMode = ref<'none' | 'reply' | 'replyAll' | 'forward'>('none')
const replyTo = ref('')
const replyCc = ref('')
const replyBcc = ref('')
const replySubject = ref('')
const replyBody = ref('')
const showReplyCc = ref(false)
const showReplyBcc = ref(false)
const replySending = ref(false)
const replyContainerRef = ref<HTMLDivElement>()

// Try to show partial data instantly from the message list
function showPartialFromList() {
  if (currentMessage.value) return // already have full data from cache
  let listMsg = null
  if (isNumericUid(idParam)) {
    listMsg = messages.value.find(m => m.uid === Number(idParam))
  } else {
    const decoded = decodeMessageId(idParam)
    if (decoded) {
      listMsg = messages.value.find(m => {
        const stripped = m.messageId?.replace(/^<|>$/g, '')
        return stripped === decoded
      })
    }
  }
  if (listMsg) {
    // Show what we have from the list immediately (subject, from, date, flags)
    currentMessage.value = {
      ...listMsg,
      html: '',
      text: '',
      attachments: []
    } as any
    uid.value = listMsg.uid
  }
}

onMounted(async () => {
  // Show partial data from list cache immediately
  showPartialFromList()

  if (isNumericUid(idParam)) {
    uid.value = Number(idParam)
    await fetchMessage(uid.value, folder)
  } else {
    const decoded = decodeMessageId(idParam)
    const fromList = decoded
      ? messages.value.find(m => {
          const stripped = m.messageId?.replace(/^<|>$/g, '')
          return stripped === decoded
        })
      : null

    if (fromList) {
      uid.value = fromList.uid
      await fetchMessage(uid.value, folder)
    } else {
      await fetchMessage(idParam, folder)
      if (currentMessage.value) {
        uid.value = currentMessage.value.uid
      }
    }
  }

  if (uid.value) {
    toggleRead(uid.value, true, folder)
  }
})

function formatFullDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRelativeDate(dateStr: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatFullDate(dateStr)
}

function senderInitial(from: { name: string, address: string }[]) {
  if (!from?.length) return '?'
  const name = from[0]?.name || from[0]?.address || '?'
  return name.charAt(0).toUpperCase()
}

function senderDisplay(from: { name: string, address: string }[]) {
  if (!from?.length) return '(no sender)'
  return from[0]?.name || from[0]?.address || '(no sender)'
}

function formatAddress(addr: { name: string, address: string }) {
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address
}

async function handleArchive() {
  if (!uid.value) return
  try {
    await archiveEmail(uid.value, folder)
    toast.add({ title: 'Email archived', color: 'success', icon: 'i-lucide-check' })
    navigateTo('/inbox')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    toast.add({ title: 'Archive failed', description: e.data?.message || 'Please try again', color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

async function handleDelete() {
  if (!uid.value) return
  await deleteEmail(uid.value, folder)
  toast.add({ title: 'Email deleted', color: 'success', icon: 'i-lucide-check' })
  navigateTo('/inbox')
}

function openReply() {
  if (!currentMessage.value) return
  const from = currentMessage.value.from[0]
  replyMode.value = 'reply'
  replyTo.value = from?.address || ''
  replyCc.value = ''
  replyBcc.value = ''
  replySubject.value = currentMessage.value.subject.startsWith('Re:')
    ? currentMessage.value.subject
    : `Re: ${currentMessage.value.subject}`
  replyBody.value = ''
  showReplyCc.value = false
  showReplyBcc.value = false
  scrollToReply()
}

function openReplyAll() {
  if (!currentMessage.value) return
  const msg = currentMessage.value
  const allTo = [
    ...msg.from.map(a => a.address),
    ...msg.to.map(a => a.address)
  ].filter((v, i, a) => a.indexOf(v) === i && v !== user.value?.email)

  const ccAddresses = (msg.cc || [])
    .map(a => a.address)
    .filter(a => a !== user.value?.email && !allTo.includes(a))

  replyMode.value = 'replyAll'
  replyTo.value = allTo.join(', ')
  replyCc.value = ccAddresses.join(', ')
  replyBcc.value = ''
  replySubject.value = msg.subject.startsWith('Re:')
    ? msg.subject
    : `Re: ${msg.subject}`
  replyBody.value = ''
  showReplyCc.value = ccAddresses.length > 0
  showReplyBcc.value = false
  scrollToReply()
}

function openForward() {
  if (!currentMessage.value) return
  const msg = currentMessage.value
  openCompose({
    subject: msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`,
    body: `<br><br><div style="border-left: 1px solid #ccc; padding-left: 12px; margin-left: 0; color: #666;">
<p>---------- Forwarded message ----------</p>
<p><strong>From:</strong> ${msg.from.map(formatAddress).join(', ')}</p>
<p><strong>Date:</strong> ${formatFullDate(msg.date)}</p>
<p><strong>Subject:</strong> ${msg.subject}</p>
<p><strong>To:</strong> ${msg.to?.map(formatAddress).join(', ')}</p>
<br>
${msg.html || msg.text?.replace(/\n/g, '<br>') || ''}
</div>`
  })
}

function closeReply() {
  replyMode.value = 'none'
  replyBody.value = ''
  replyTo.value = ''
  replyCc.value = ''
  replyBcc.value = ''
}

function scrollToReply() {
  nextTick(() => {
    replyContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function handleSendReply() {
  if (!replyTo.value && replyMode.value !== 'forward') return

  replySending.value = true
  try {
    await sendEmail({
      to: replyTo.value,
      cc: replyCc.value || undefined,
      bcc: replyBcc.value || undefined,
      subject: replySubject.value,
      html: replyBody.value || undefined,
      inReplyTo: replyMode.value !== 'forward' ? String(currentMessage.value?.uid) : undefined
    })
    toast.add({ title: 'Message sent', color: 'success', icon: 'i-lucide-check' })
    closeReply()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    toast.add({
      title: 'Failed to send',
      description: e.data?.message || 'Please try again',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    replySending.value = false
  }
}

async function handleStarToggle() {
  if (!currentMessage.value) return
  const starred = currentMessage.value.flags.includes('\\Flagged')
  await toggleStarred(uid.value, !starred, folder)
  if (starred) {
    currentMessage.value.flags = currentMessage.value.flags.filter(f => f !== '\\Flagged')
  } else {
    currentMessage.value.flags.push('\\Flagged')
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAttachmentIcon(contentType: string) {
  if (!contentType) return 'i-lucide-file'
  if (contentType.startsWith('image/')) return 'i-lucide-image'
  if (contentType === 'application/pdf') return 'i-lucide-file-text'
  if (contentType.startsWith('video/')) return 'i-lucide-film'
  if (contentType.startsWith('audio/')) return 'i-lucide-music'
  if (contentType.includes('zip') || contentType.includes('archive') || contentType.includes('compressed')) return 'i-lucide-file-archive'
  if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType.includes('.sheet')) return 'i-lucide-file-spreadsheet'
  if (contentType.includes('word') || contentType.includes('document')) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

function isViewableType(contentType: string) {
  if (!contentType) return false
  return contentType.startsWith('image/') || contentType === 'application/pdf' || contentType.startsWith('text/')
}

const replyLabel = computed(() => {
  switch (replyMode.value) {
    case 'replyAll': return 'Reply all'
    case 'forward': return 'Forward'
    default: return 'Reply'
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Loading (only show full spinner if we have no data at all) -->
    <div v-if="loadingMessage && !currentMessage" class="flex items-center justify-center flex-1">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-3xl text-primary" />
    </div>

    <template v-else-if="currentMessage">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 px-2 sm:px-4 py-1.5 border-b border-default shrink-0">
        <UButton
          to="/inbox"
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
        />

        <UButton
          icon="i-lucide-archive"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Archive"
          @click="handleArchive"
        />
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Delete"
          @click="handleDelete"
        />
        <UButton
          icon="i-lucide-mail"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Mark as unread"
          @click="toggleRead(uid, false, folder); navigateTo('/inbox')"
        />

        <div class="flex-1" />

        <UButton
          icon="i-lucide-reply"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Reply"
          @click="openReply"
        />
        <UButton
          icon="i-lucide-reply-all"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Reply all"
          @click="openReplyAll"
        />
        <UButton
          icon="i-lucide-forward"
          variant="ghost"
          color="neutral"
          size="sm"
          title="Forward"
          @click="openForward"
        />
      </div>

      <!-- Email Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <!-- Subject -->
          <div class="flex items-start gap-2 mb-4">
            <h1 class="text-xl sm:text-2xl font-normal flex-1">{{ currentMessage.subject }}</h1>
            <button class="mt-1 shrink-0" @click="handleStarToggle">
              <UIcon
                name="i-lucide-star"
                class="text-lg transition-colors"
                :class="currentMessage.flags.includes('\\Flagged') ? 'text-yellow-500' : 'text-muted hover:text-yellow-400'"
              />
            </button>
          </div>

          <!-- Sender info -->
          <div class="flex items-start gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
              {{ senderInitial(currentMessage.from) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-sm">
                  {{ senderDisplay(currentMessage.from) }}
                </span>
                <span class="text-xs text-muted">
                  &lt;{{ currentMessage.from[0]?.address }}&gt;
                </span>
                <span class="text-xs text-muted ml-auto shrink-0 hidden sm:inline">
                  {{ formatRelativeDate(currentMessage.date) }}
                </span>
              </div>
              <button
                class="text-xs text-muted hover:text-highlighted transition-colors"
                @click="showDetails = !showDetails"
              >
                to {{ currentMessage.to?.map(a => a.name || a.address).join(', ') }}
                <UIcon :name="showDetails ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="text-[10px] ml-0.5" />
              </button>

              <!-- Expanded details -->
              <div v-if="showDetails" class="mt-2 text-xs text-muted space-y-1 bg-elevated rounded-lg p-3">
                <div><span class="font-medium">From:</span> {{ currentMessage.from.map(formatAddress).join(', ') }}</div>
                <div><span class="font-medium">To:</span> {{ currentMessage.to?.map(formatAddress).join(', ') }}</div>
                <div v-if="currentMessage.cc?.length"><span class="font-medium">Cc:</span> {{ currentMessage.cc.map(formatAddress).join(', ') }}</div>
                <div><span class="font-medium">Date:</span> {{ formatFullDate(currentMessage.date) }}</div>
              </div>
            </div>
          </div>

          <!-- Attachments -->
          <div v-if="currentMessage.attachments?.length" class="flex flex-wrap gap-2 mb-4">
            <div
              v-for="att in currentMessage.attachments"
              :key="att.filename"
              class="flex items-center gap-2 px-3 py-2 bg-elevated rounded-lg border border-default"
            >
              <UIcon :name="getAttachmentIcon(att.contentType)" class="text-muted text-sm shrink-0" />
              <a
                :href="`/api/mail/attachment?uid=${uid}&folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(att.filename)}&mode=view`"
                target="_blank"
                class="hover:underline cursor-pointer min-w-0"
              >
                <p class="text-xs font-medium truncate">{{ att.filename }}</p>
                <p class="text-[11px] text-muted">{{ formatFileSize(att.size) }}</p>
              </a>
              <a
                :href="`/api/mail/attachment?uid=${uid}&folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(att.filename)}`"
                download
                class="text-muted hover:text-highlighted transition-colors cursor-pointer ml-1 shrink-0"
                title="Download"
              >
                <UIcon name="i-lucide-download" class="text-sm" />
              </a>
            </div>
          </div>

          <!-- Email Body -->
          <div class="border-t border-default pt-4">
            <div v-if="!currentMessage.html && !currentMessage.text && loadingMessage" class="flex items-center gap-2 py-8 justify-center">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-lg text-primary" />
              <span class="text-sm text-muted">Loading message...</span>
            </div>
            <div
              v-else-if="currentMessage.html"
              class="prose prose-sm max-w-none dark:prose-invert"
              v-html="currentMessage.html"
            />
            <pre v-else-if="currentMessage.text" class="whitespace-pre-wrap text-sm font-sans">{{ currentMessage.text }}</pre>
          </div>

          <!-- Inline Reply Compose -->
          <div v-if="replyMode !== 'none'" ref="replyContainerRef" class="mt-6 border border-default rounded-xl overflow-hidden">
            <!-- Reply header -->
            <div class="flex items-center gap-2 px-4 py-2.5 bg-elevated border-b border-default">
              <UIcon
                :name="replyMode === 'forward' ? 'i-lucide-forward' : replyMode === 'replyAll' ? 'i-lucide-reply-all' : 'i-lucide-reply'"
                class="text-sm text-muted"
              />
              <span class="text-sm font-medium">{{ replyLabel }}</span>
              <div class="flex-1" />
              <button class="text-muted hover:text-highlighted" @click="closeReply">
                <UIcon name="i-lucide-x" class="text-sm" />
              </button>
            </div>

            <!-- Recipient fields -->
            <div class="border-b border-default">
              <div class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
                <span class="text-xs text-muted w-10 shrink-0">To</span>
                <input
                  v-model="replyTo"
                  type="text"
                  class="flex-1 bg-transparent text-sm outline-none"
                  placeholder="Recipients"
                >
                <div class="flex gap-1 text-xs shrink-0">
                  <button
                    v-if="!showReplyCc"
                    class="text-muted hover:text-highlighted px-1"
                    @click="showReplyCc = true"
                  >
                    Cc
                  </button>
                  <button
                    v-if="!showReplyBcc"
                    class="text-muted hover:text-highlighted px-1"
                    @click="showReplyBcc = true"
                  >
                    Bcc
                  </button>
                </div>
              </div>

              <div v-if="showReplyCc" class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
                <span class="text-xs text-muted w-10 shrink-0">Cc</span>
                <input
                  v-model="replyCc"
                  type="text"
                  class="flex-1 bg-transparent text-sm outline-none"
                >
                <button class="text-muted hover:text-highlighted" @click="showReplyCc = false; replyCc = ''">
                  <UIcon name="i-lucide-x" class="text-xs" />
                </button>
              </div>

              <div v-if="showReplyBcc" class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
                <span class="text-xs text-muted w-10 shrink-0">Bcc</span>
                <input
                  v-model="replyBcc"
                  type="text"
                  class="flex-1 bg-transparent text-sm outline-none"
                >
                <button class="text-muted hover:text-highlighted" @click="showReplyBcc = false; replyBcc = ''">
                  <UIcon name="i-lucide-x" class="text-xs" />
                </button>
              </div>
            </div>

            <!-- Rich text editor -->
            <ComposeEditor
              v-model="replyBody"
              placeholder="Write your reply..."
              min-height="150px"
              compact
            />

            <!-- Bottom bar -->
            <div class="flex items-center gap-2 px-4 py-2.5 border-t border-default">
              <UButton
                label="Send"
                icon="i-lucide-send"
                size="sm"
                :loading="replySending"
                :disabled="!replyTo && replyMode !== 'forward'"
                @click="handleSendReply"
              />

              <div class="flex items-center gap-0.5 ml-1">
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                  title="Attach files"
                >
                  <UIcon name="i-lucide-paperclip" class="text-sm" />
                </button>
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                  title="Insert link"
                >
                  <UIcon name="i-lucide-link" class="text-sm" />
                </button>
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                  title="Insert emoji"
                >
                  <UIcon name="i-lucide-smile" class="text-sm" />
                </button>
              </div>

              <div class="flex-1" />

              <button
                type="button"
                class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
                title="Discard"
                @click="closeReply"
              >
                <UIcon name="i-lucide-trash-2" class="text-sm" />
              </button>
            </div>
          </div>

          <!-- Reply/Forward buttons (shown when no inline reply is open) -->
          <div v-else class="mt-6 border border-default rounded-xl p-4">
            <div class="flex gap-2">
              <UButton
                icon="i-lucide-reply"
                label="Reply"
                variant="soft"
                size="sm"
                @click="openReply"
              />
              <UButton
                icon="i-lucide-reply-all"
                label="Reply all"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="openReplyAll"
              />
              <UButton
                icon="i-lucide-forward"
                label="Forward"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="openForward"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
