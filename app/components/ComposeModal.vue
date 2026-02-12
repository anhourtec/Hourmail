<script setup lang="ts">
const { user } = useAuth()
const { composeState, composeData, draftSavedAt, draftSource, closeCompose, discardCompose, clearDraft, toggleMinimize, toggleMaximize } = useCompose()
const { addToOutbox } = useOutbox()
const { deleteEmail } = useMail()
const { fetchContacts, searchContacts, addSentContacts } = useContacts()
const { signatures, fetchSignatures, getDefaultSignature } = useSignatures()
const toast = useToast()

const showCc = ref(false)
const showBcc = ref(false)
const sending = ref(false)
const toRef = ref<HTMLInputElement>()
const ccRef = ref<HTMLInputElement>()
const bccRef = ref<HTMLInputElement>()
const editorRef = ref<{ insertAtCursor: (text: string) => void, insertHtmlAtEnd: (html: string) => void, removeSignature: () => void }>()
const fileInputRef = ref<HTMLInputElement>()
const showEmojiPicker = ref(false)
const showSigPicker = ref(false)
const attachments = ref<File[]>([])

// Autocomplete state
const autocompleteField = ref<'to' | 'cc' | 'bcc' | null>(null)
const autocompleteResults = ref<{ name: string, address: string }[]>([])
const autocompleteIndex = ref(-1)

watch(composeState, async (state) => {
  if (state === 'open') {
    showCc.value = !!composeData.cc
    showBcc.value = !!composeData.bcc
    showEmojiPicker.value = false
    showSigPicker.value = false
    attachments.value = []
    autocompleteField.value = null
    autocompleteResults.value = []
    fetchContacts()
    await fetchSignatures()
    nextTick(() => {
      toRef.value?.focus()
      // Auto-insert default signature when body is empty
      if (!composeData.body) {
        const defaultSig = getDefaultSignature()
        if (defaultSig) {
          nextTick(() => editorRef.value?.insertHtmlAtEnd(defaultSig.body))
        }
      }
    })
  }
})

function selectSignature(sigBody: string) {
  editorRef.value?.insertHtmlAtEnd(sigBody)
  showSigPicker.value = false
}

function removeSignature() {
  editorRef.value?.removeSignature()
  showSigPicker.value = false
}

function getCurrentSegment(value: string): string {
  const parts = value.split(',')
  return (parts[parts.length - 1] || '').trim()
}

function replaceCurrentSegment(value: string, replacement: string): string {
  const parts = value.split(',')
  parts[parts.length - 1] = ' ' + replacement
  // Clean up: trim the first part's leading space
  const result = parts.map((p, i) => i === 0 ? p.trim() : p).join(',')
  return result + ', '
}

function handleAddressInput(field: 'to' | 'cc' | 'bcc') {
  const value = field === 'to' ? composeData.to : field === 'cc' ? composeData.cc : composeData.bcc
  const segment = getCurrentSegment(value)

  if (segment.length >= 1) {
    autocompleteField.value = field
    autocompleteResults.value = searchContacts(segment)
    autocompleteIndex.value = -1
  } else {
    autocompleteField.value = null
    autocompleteResults.value = []
  }
}

function selectContact(contact: { name: string, address: string }) {
  const field = autocompleteField.value
  if (!field) return

  const insertion = contact.name && contact.name !== contact.address.split('@')[0]
    ? `${contact.name} <${contact.address}>`
    : contact.address

  if (field === 'to') {
    composeData.to = replaceCurrentSegment(composeData.to, insertion)
  } else if (field === 'cc') {
    composeData.cc = replaceCurrentSegment(composeData.cc, insertion)
  } else {
    composeData.bcc = replaceCurrentSegment(composeData.bcc, insertion)
  }

  autocompleteField.value = null
  autocompleteResults.value = []
  autocompleteIndex.value = -1

  // Re-focus the input
  nextTick(() => {
    if (field === 'to') toRef.value?.focus()
    else if (field === 'cc') ccRef.value?.focus()
    else bccRef.value?.focus()
  })
}

function handleAddressKeydown(e: KeyboardEvent, _field: 'to' | 'cc' | 'bcc') {
  if (autocompleteResults.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    autocompleteIndex.value = Math.min(autocompleteIndex.value + 1, autocompleteResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    autocompleteIndex.value = Math.max(autocompleteIndex.value - 1, -1)
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (autocompleteIndex.value >= 0) {
      e.preventDefault()
      selectContact(autocompleteResults.value[autocompleteIndex.value]!)
    }
  } else if (e.key === 'Escape') {
    autocompleteField.value = null
    autocompleteResults.value = []
  }
}

function handleAddressBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    autocompleteField.value = null
    autocompleteResults.value = []
  }, 200)
}

function handleEmojiSelect(emoji: string) {
  editorRef.value?.insertAtCursor(emoji)
  showEmojiPicker.value = false
}

function handleAttachClick() {
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    attachments.value = [...attachments.value, ...Array.from(input.files)]
  }
  input.value = '' // Reset so same file can be selected again
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

async function deleteDraftSource() {
  if (draftSource.uid && draftSource.folder) {
    try {
      await deleteEmail(draftSource.uid, draftSource.folder)
    } catch {
      // Best-effort — don't block send
    }
  }
}

async function handleSend() {
  if (!composeData.to) return

  // Capture draft source before discarding clears it
  const hadDraftSource = draftSource.uid > 0

  if (attachments.value.length > 0) {
    // Send with attachments directly (can't queue FormData easily)
    sending.value = true
    try {
      const formData = new FormData()
      formData.append('to', composeData.to)
      if (composeData.cc) formData.append('cc', composeData.cc)
      if (composeData.bcc) formData.append('bcc', composeData.bcc)
      formData.append('subject', composeData.subject || '(no subject)')
      if (composeData.body) formData.append('html', composeData.body)
      if (composeData.inReplyTo) formData.append('inReplyTo', composeData.inReplyTo)
      for (const file of attachments.value) {
        formData.append('attachments', file)
      }
      await $fetch('/api/mail/send', { method: 'POST', body: formData })
      addSentContacts(composeData.to, composeData.cc, composeData.bcc)
      toast.add({ title: 'Message sent', color: 'success', icon: 'i-lucide-check' })
      // Delete the original draft from IMAP if editing one
      if (hadDraftSource) await deleteDraftSource()
      clearDraft()
      discardCompose()
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } }
      toast.add({
        title: 'Failed to send',
        description: error.data?.message || 'Please try again',
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    } finally {
      sending.value = false
    }
  } else {
    // Queue in outbox — close compose immediately
    addToOutbox({
      to: composeData.to,
      cc: composeData.cc || undefined,
      bcc: composeData.bcc || undefined,
      subject: composeData.subject || '(no subject)',
      html: composeData.body || undefined,
      inReplyTo: composeData.inReplyTo
    })
    addSentContacts(composeData.to, composeData.cc, composeData.bcc)
    toast.add({ title: 'Queued for sending', color: 'info', icon: 'i-lucide-send' })
    // Delete the original draft from IMAP if editing one
    if (hadDraftSource) deleteDraftSource()
    clearDraft()
    discardCompose()
  }
}

const headerLabel = computed(() => {
  if (composeData.subject) return composeData.subject
  return 'New Message'
})
</script>

<template>
  <Teleport to="body">
    <!-- Normal / Maximized -->
    <div
      v-if="composeState !== 'closed'"
      class="fixed z-100 flex flex-col bg-default border border-default shadow-2xl overflow-hidden"
      :class="[
        composeState === 'maximized'
          ? 'inset-0 sm:inset-8 sm:rounded-xl'
          : composeState === 'minimized'
            ? 'bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:w-72 rounded-t-xl'
            : 'inset-0 sm:inset-auto sm:bottom-0 sm:right-6 sm:w-140 sm:h-130 sm:max-h-[calc(100vh-5rem)] sm:rounded-t-xl'
      ]"
    >
      <!-- Header bar -->
      <div
        class="flex items-center gap-2 px-4 py-2 bg-elevated shrink-0 cursor-pointer select-none"
        @click="composeState === 'minimized' ? toggleMinimize() : undefined"
      >
        <span class="text-sm font-medium truncate flex-1">{{ headerLabel }}</span>

        <div class="flex items-center gap-0.5 shrink-0">
          <!-- Minimize (desktop only) -->
          <button
            class="hidden sm:flex w-6 h-6 items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Minimize"
            @click.stop="toggleMinimize"
          >
            <UIcon
              name="i-lucide-minus"
              class="text-sm"
            />
          </button>
          <!-- Maximize / Restore (desktop only) -->
          <button
            v-if="composeState !== 'minimized'"
            class="hidden sm:flex w-6 h-6 items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            :title="composeState === 'maximized' ? 'Restore' : 'Full screen'"
            @click.stop="toggleMaximize"
          >
            <UIcon
              :name="composeState === 'maximized' ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
              class="text-sm"
            />
          </button>
          <!-- Close -->
          <button
            class="w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Close"
            @click.stop="closeCompose"
          >
            <UIcon
              name="i-lucide-x"
              class="text-sm"
            />
          </button>
        </div>
      </div>

      <!-- Body (hidden when minimized) -->
      <template v-if="composeState !== 'minimized'">
        <!-- Fields -->
        <div class="border-b border-default shrink-0">
          <!-- From -->
          <div class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
            <span class="text-xs text-muted w-12 shrink-0">From</span>
            <span class="text-sm truncate">{{ user?.email }}</span>
          </div>

          <!-- To -->
          <div class="relative">
            <div class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
              <span class="text-xs text-muted w-12 shrink-0">To</span>
              <input
                ref="toRef"
                v-model="composeData.to"
                type="text"
                class="flex-1 bg-transparent text-sm outline-none placeholder-muted min-w-0"
                placeholder="Recipients"
                @input="handleAddressInput('to')"
                @keydown="handleAddressKeydown($event, 'to')"
                @blur="handleAddressBlur"
              >
              <div class="flex gap-1 text-xs shrink-0">
                <button
                  v-if="!showCc"
                  class="text-muted hover:text-highlighted px-1"
                  @click="showCc = true"
                >
                  Cc
                </button>
                <button
                  v-if="!showBcc"
                  class="text-muted hover:text-highlighted px-1"
                  @click="showBcc = true"
                >
                  Bcc
                </button>
              </div>
            </div>

            <!-- Autocomplete dropdown for To -->
            <div
              v-if="autocompleteField === 'to' && autocompleteResults.length > 0"
              class="absolute left-4 right-4 top-full z-50 bg-elevated border border-default rounded-lg shadow-xl py-1 max-h-52 overflow-y-auto"
            >
              <button
                v-for="(contact, i) in autocompleteResults"
                :key="contact.address"
                class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-default transition-colors"
                :class="i === autocompleteIndex ? 'bg-default' : ''"
                @mousedown.prevent="selectContact(contact)"
              >
                <UAvatar
                  :alt="contact.name || contact.address"
                  size="2xs"
                />
                <div class="min-w-0 flex-1">
                  <p
                    v-if="contact.name"
                    class="font-medium truncate text-sm"
                  >
                    {{ contact.name }}
                  </p>
                  <p class="text-xs text-muted truncate">
                    {{ contact.address }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <!-- Cc -->
          <div
            v-if="showCc"
            class="relative"
          >
            <div class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
              <span class="text-xs text-muted w-12 shrink-0">Cc</span>
              <input
                ref="ccRef"
                v-model="composeData.cc"
                type="text"
                class="flex-1 bg-transparent text-sm outline-none min-w-0"
                @input="handleAddressInput('cc')"
                @keydown="handleAddressKeydown($event, 'cc')"
                @blur="handleAddressBlur"
              >
              <button
                class="text-muted hover:text-highlighted"
                @click="showCc = false; composeData.cc = ''"
              >
                <UIcon
                  name="i-lucide-x"
                  class="text-xs"
                />
              </button>
            </div>

            <!-- Autocomplete dropdown for Cc -->
            <div
              v-if="autocompleteField === 'cc' && autocompleteResults.length > 0"
              class="absolute left-4 right-4 top-full z-50 bg-elevated border border-default rounded-lg shadow-xl py-1 max-h-52 overflow-y-auto"
            >
              <button
                v-for="(contact, i) in autocompleteResults"
                :key="contact.address"
                class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-default transition-colors"
                :class="i === autocompleteIndex ? 'bg-default' : ''"
                @mousedown.prevent="selectContact(contact)"
              >
                <UAvatar
                  :alt="contact.name || contact.address"
                  size="2xs"
                />
                <div class="min-w-0 flex-1">
                  <p
                    v-if="contact.name"
                    class="font-medium truncate text-sm"
                  >
                    {{ contact.name }}
                  </p>
                  <p class="text-xs text-muted truncate">
                    {{ contact.address }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <!-- Bcc -->
          <div
            v-if="showBcc"
            class="relative"
          >
            <div class="flex items-center gap-2 px-4 py-1.5 border-b border-default">
              <span class="text-xs text-muted w-12 shrink-0">Bcc</span>
              <input
                ref="bccRef"
                v-model="composeData.bcc"
                type="text"
                class="flex-1 bg-transparent text-sm outline-none min-w-0"
                @input="handleAddressInput('bcc')"
                @keydown="handleAddressKeydown($event, 'bcc')"
                @blur="handleAddressBlur"
              >
              <button
                class="text-muted hover:text-highlighted"
                @click="showBcc = false; composeData.bcc = ''"
              >
                <UIcon
                  name="i-lucide-x"
                  class="text-xs"
                />
              </button>
            </div>

            <!-- Autocomplete dropdown for Bcc -->
            <div
              v-if="autocompleteField === 'bcc' && autocompleteResults.length > 0"
              class="absolute left-4 right-4 top-full z-50 bg-elevated border border-default rounded-lg shadow-xl py-1 max-h-52 overflow-y-auto"
            >
              <button
                v-for="(contact, i) in autocompleteResults"
                :key="contact.address"
                class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-default transition-colors"
                :class="i === autocompleteIndex ? 'bg-default' : ''"
                @mousedown.prevent="selectContact(contact)"
              >
                <UAvatar
                  :alt="contact.name || contact.address"
                  size="2xs"
                />
                <div class="min-w-0 flex-1">
                  <p
                    v-if="contact.name"
                    class="font-medium truncate text-sm"
                  >
                    {{ contact.name }}
                  </p>
                  <p class="text-xs text-muted truncate">
                    {{ contact.address }}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <!-- Subject -->
          <div class="flex items-center gap-2 px-4 py-1.5">
            <span class="text-xs text-muted w-12 shrink-0">Subject</span>
            <input
              v-model="composeData.subject"
              type="text"
              class="flex-1 bg-transparent text-sm outline-none min-w-0"
              placeholder=""
            >
          </div>
        </div>

        <!-- Rich text editor -->
        <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ComposeEditor
            ref="editorRef"
            v-model="composeData.body"
            placeholder="Compose email..."
            :min-height="composeState === 'maximized' ? '300px' : '120px'"
            class="flex-1 min-h-0 overflow-y-auto"
          />
        </div>

        <!-- Attachments list -->
        <div
          v-if="attachments.length > 0"
          class="px-4 py-2 border-t border-default shrink-0 space-y-1.5 max-h-24 overflow-y-auto"
        >
          <div
            v-for="(file, i) in attachments"
            :key="i"
            class="flex items-center gap-2 bg-elevated rounded-md px-2.5 py-1.5"
          >
            <UIcon
              name="i-lucide-file"
              class="text-muted text-sm shrink-0"
            />
            <span class="text-xs truncate flex-1">{{ file.name }}</span>
            <span class="text-[10px] text-muted shrink-0">{{ formatFileSize(file.size) }}</span>
            <button
              class="text-muted hover:text-highlighted shrink-0"
              @click="removeAttachment(i)"
            >
              <UIcon
                name="i-lucide-x"
                class="text-xs"
              />
            </button>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border-t border-default shrink-0">
          <UButton
            label="Send"
            icon="i-lucide-send"
            size="sm"
            :loading="sending"
            :disabled="!composeData.to"
            @click="handleSend"
          />

          <div class="flex items-center gap-0.5 ml-0.5 sm:ml-1 relative">
            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              class="hidden"
              @change="handleFileSelect"
            >

            <button
              type="button"
              class="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
              title="Attach files"
              @click="handleAttachClick"
            >
              <UIcon
                name="i-lucide-paperclip"
                class="text-sm"
              />
            </button>
            <button
              type="button"
              class="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-elevated transition-colors"
              :class="showEmojiPicker ? 'bg-elevated text-highlighted' : 'text-muted hover:text-highlighted'"
              title="Insert emoji"
              @click="showEmojiPicker = !showEmojiPicker"
            >
              <UIcon
                name="i-lucide-smile"
                class="text-sm"
              />
            </button>

            <!-- Signature picker -->
            <button
              v-if="signatures.length > 0"
              type="button"
              class="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-elevated transition-colors"
              :class="showSigPicker ? 'bg-elevated text-highlighted' : 'text-muted hover:text-highlighted'"
              title="Insert signature"
              @click="showSigPicker = !showSigPicker"
            >
              <UIcon
                name="i-lucide-pen-line"
                class="text-sm"
              />
            </button>

            <!-- Emoji picker popup -->
            <div
              v-if="showEmojiPicker"
              class="absolute bottom-full left-0 mb-2"
            >
              <EmojiPicker @select="handleEmojiSelect" />
            </div>

            <!-- Signature picker popup -->
            <div
              v-if="showSigPicker"
              class="absolute bottom-full left-0 mb-2 w-56 bg-elevated border border-default rounded-lg shadow-xl py-1 z-50"
            >
              <button
                v-for="sig in signatures"
                :key="sig.id"
                class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-default transition-colors"
                @click="selectSignature(sig.body)"
              >
                <UIcon
                  name="i-lucide-pen-line"
                  class="text-muted text-xs shrink-0"
                />
                <span class="truncate">{{ sig.name }}</span>
                <span
                  v-if="sig.isDefault"
                  class="text-[10px] text-primary ml-auto shrink-0"
                >default</span>
              </button>
              <div class="border-t border-default my-1" />
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-muted hover:bg-default transition-colors"
                @click="removeSignature"
              >
                <UIcon
                  name="i-lucide-x"
                  class="text-xs shrink-0"
                />
                No signature
              </button>
            </div>
          </div>

          <div class="flex-1" />

          <span
            v-if="draftSavedAt"
            class="text-[11px] text-muted mr-1 sm:mr-2 hidden sm:inline"
          >
            Draft saved
          </span>

          <button
            type="button"
            class="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-elevated text-muted hover:text-highlighted transition-colors"
            title="Discard"
            @click="discardCompose"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="text-sm"
            />
          </button>
        </div>
      </template>
    </div>

    <!-- Click outside emoji/sig picker to close -->
    <div
      v-if="showEmojiPicker || showSigPicker"
      class="fixed inset-0 z-99"
      @click="showEmojiPicker = false; showSigPicker = false"
    />
  </Teleport>
</template>
