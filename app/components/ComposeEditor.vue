<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  minHeight?: string
  compact?: boolean
}>(), {
  placeholder: 'Compose email...',
  minHeight: '300px',
  compact: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
const showLinkDialog = ref(false)
const linkUrl = ref('')

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value)
  editorRef.value?.focus()
  emitUpdate()
}

function emitUpdate() {
  if (editorRef.value) {
    emit('update:modelValue', editorRef.value.innerHTML)
  }
}

function handleInput() {
  emitUpdate()
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertHTML', false, text)
  emitUpdate()
}

function insertLink() {
  if (linkUrl.value) {
    const selection = window.getSelection()
    const hasSelection = selection && selection.toString().length > 0
    if (hasSelection) {
      execCmd('createLink', linkUrl.value)
    } else {
      execCmd('insertHTML', `<a href="${linkUrl.value}" target="_blank">${linkUrl.value}</a>`)
    }
  }
  showLinkDialog.value = false
  linkUrl.value = ''
}

function openLinkDialog() {
  showLinkDialog.value = true
  nextTick(() => {
    const input = document.querySelector('#link-url-input') as HTMLInputElement
    input?.focus()
  })
}

function insertAtCursor(text: string) {
  editorRef.value?.focus()
  document.execCommand('insertText', false, text)
  emitUpdate()
}

defineExpose({ insertAtCursor })

onMounted(() => {
  if (editorRef.value && props.modelValue) {
    editorRef.value.innerHTML = props.modelValue
  }
})

watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && editorRef.value.innerHTML !== newVal) {
    editorRef.value.innerHTML = newVal
  }
})

const toolbarButtons = [
  { cmd: 'undo', icon: 'i-lucide-undo-2', title: 'Undo' },
  { cmd: 'redo', icon: 'i-lucide-redo-2', title: 'Redo' },
  { divider: true },
  { cmd: 'bold', icon: 'i-lucide-bold', title: 'Bold' },
  { cmd: 'italic', icon: 'i-lucide-italic', title: 'Italic' },
  { cmd: 'underline', icon: 'i-lucide-underline', title: 'Underline' },
  { cmd: 'strikeThrough', icon: 'i-lucide-strikethrough', title: 'Strikethrough' },
  { divider: true },
  { cmd: 'insertUnorderedList', icon: 'i-lucide-list', title: 'Bullet list' },
  { cmd: 'insertOrderedList', icon: 'i-lucide-list-ordered', title: 'Numbered list' },
  { cmd: 'indent', icon: 'i-lucide-indent-increase', title: 'Indent' },
  { cmd: 'outdent', icon: 'i-lucide-indent-decrease', title: 'Outdent' },
  { divider: true },
  { cmd: 'justifyLeft', icon: 'i-lucide-align-left', title: 'Align left' },
  { cmd: 'justifyCenter', icon: 'i-lucide-align-center', title: 'Align center' },
  { cmd: 'justifyRight', icon: 'i-lucide-align-right', title: 'Align right' },
  { divider: true },
  { cmd: 'removeFormat', icon: 'i-lucide-remove-formatting', title: 'Clear formatting' }
]
</script>

<template>
  <div class="flex flex-col">
    <!-- Formatting toolbar -->
    <div
      class="flex items-center gap-0.5 px-2 py-1 border-b border-default flex-wrap"
      :class="compact ? 'bg-default/50' : ''"
    >
      <template
        v-for="(btn, i) in toolbarButtons"
        :key="i"
      >
        <div
          v-if="btn.divider"
          class="w-px h-4 bg-default mx-0.5"
        />
        <button
          v-else
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-elevated text-muted hover:text-highlighted transition-colors"
          :title="btn.title"
          @mousedown.prevent
          @click="execCmd(btn.cmd!)"
        >
          <UIcon
            :name="btn.icon!"
            class="text-sm"
          />
        </button>
      </template>

      <!-- Link button -->
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-elevated text-muted hover:text-highlighted transition-colors"
        title="Insert link"
        @mousedown.prevent
        @click="openLinkDialog"
      >
        <UIcon
          name="i-lucide-link"
          class="text-sm"
        />
      </button>
    </div>

    <!-- Link dialog -->
    <div
      v-if="showLinkDialog"
      class="flex items-center gap-2 px-3 py-2 bg-elevated border-b border-default"
    >
      <UIcon
        name="i-lucide-link"
        class="text-muted text-sm shrink-0"
      />
      <input
        id="link-url-input"
        v-model="linkUrl"
        type="url"
        placeholder="Enter URL..."
        class="flex-1 bg-transparent text-sm outline-none"
        @keydown.enter="insertLink"
        @keydown.escape="showLinkDialog = false"
      >
      <UButton
        label="Insert"
        size="xs"
        @click="insertLink"
      />
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="showLinkDialog = false"
      />
    </div>

    <!-- Editable area -->
    <div
      ref="editorRef"
      contenteditable="true"
      class="flex-1 outline-none text-sm px-4 py-3 overflow-y-auto prose prose-sm max-w-none dark:prose-invert"
      :style="{ minHeight }"
      :data-placeholder="placeholder"
      @input="handleInput"
      @paste="handlePaste"
    />
  </div>
</template>

<style scoped>
[contenteditable]:empty::before {
  content: attr(data-placeholder);
  color: var(--ui-text-muted);
  pointer-events: none;
}
</style>
