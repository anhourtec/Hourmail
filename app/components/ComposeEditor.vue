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
const imageInputRef = ref<HTMLInputElement>()

// Image resize state
const selectedImage = ref<HTMLImageElement | null>(null)
const imageToolbarPos = ref({ top: 0, left: 0 })
const imageWidth = ref('')

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value)
  editorRef.value?.focus()
  emitUpdate()
}

function emitUpdate() {
  if (editorRef.value) {
    // Clone and strip the visual-only separator before emitting
    const clone = editorRef.value.cloneNode(true) as HTMLElement
    clone.querySelector('[data-sig-separator]')?.remove()
    // Remove selection marker from images in emitted HTML
    clone.querySelectorAll('img[data-img-selected]').forEach((img) => {
      delete (img as HTMLElement).dataset.imgSelected
    })
    emit('update:modelValue', clone.innerHTML)
  }
}

function handleInput() {
  emitUpdate()
}

async function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const html = e.clipboardData?.getData('text/html')
  if (html) {
    // Check for cid: images (from Outlook/email signatures)
    if (html.includes('src="cid:')) {
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const cidImgs = parsed.querySelectorAll('img[src^="cid:"]')

      // Collect clipboard image blobs to replace cid: references
      const imageFiles: File[] = []
      if (e.clipboardData?.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) imageFiles.push(file)
          }
        }
      }

      // Convert clipboard images to data URLs and replace cid: refs in order
      if (imageFiles.length > 0) {
        const dataUrls = await Promise.all(imageFiles.map(file =>
          new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => resolve('')
            reader.readAsDataURL(file)
          })
        ))

        cidImgs.forEach((img, i) => {
          if (i < dataUrls.length && dataUrls[i]) {
            img.setAttribute('src', dataUrls[i]!)
          } else {
            img.remove()
          }
        })
      } else {
        // No image data available — remove broken cid: images
        cidImgs.forEach(img => img.remove())
      }

      const cleanedHtml = parsed.body.innerHTML
      document.execCommand('insertHTML', false, cleanedHtml)
    } else {
      document.execCommand('insertHTML', false, html)
    }
  } else {
    const plain = e.clipboardData?.getData('text/plain') || ''
    // Convert plain text to HTML preserving line breaks and escaping entities
    const escaped = plain
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
    document.execCommand('insertHTML', false, escaped)
  }
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

function triggerImageInsert() {
  imageInputRef.value?.click()
}

function handleImageInsert(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    editorRef.value?.focus()
    document.execCommand('insertHTML', false, `<img src="${dataUrl}" style="max-width: 100%; height: auto;" />`)
    emitUpdate()
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function insertAtCursor(text: string) {
  editorRef.value?.focus()
  document.execCommand('insertText', false, text)
  emitUpdate()
}

function insertHtmlAtEnd(html: string) {
  if (!editorRef.value) return
  // Remove existing signature + separator
  editorRef.value.querySelector('[data-signature]')?.remove()
  editorRef.value.querySelector('[data-sig-separator]')?.remove()

  // Ensure there's a clean empty paragraph to type in above the signature
  const hasContent = editorRef.value.textContent?.trim()
  if (!hasContent) {
    const p = document.createElement('div')
    p.innerHTML = '<br>'
    editorRef.value.appendChild(p)
  }

  // Add separator line
  const separator = document.createElement('div')
  separator.setAttribute('data-sig-separator', 'true')
  separator.setAttribute('contenteditable', 'false')
  separator.innerHTML = '<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 12px 0;">'
  editorRef.value.appendChild(separator)

  // Append signature block (not editable inline to prevent style bleed)
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-signature', 'true')
  wrapper.setAttribute('contenteditable', 'false')
  wrapper.innerHTML = html
  editorRef.value.appendChild(wrapper)
  emitUpdate()
}

function removeSignature() {
  if (!editorRef.value) return
  editorRef.value.querySelector('[data-signature]')?.remove()
  editorRef.value.querySelector('[data-sig-separator]')?.remove()
  emitUpdate()
}

// --- Image resize ---

function handleEditorClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    selectImage(target as HTMLImageElement)
  } else {
    deselectImage()
  }
}

function selectImage(img: HTMLImageElement) {
  // Deselect previous
  deselectImage()

  selectedImage.value = img
  img.dataset.imgSelected = 'true'
  imageWidth.value = String(img.width || img.naturalWidth || '')

  // Position toolbar above the image
  positionToolbar(img)
}

function positionToolbar(img: HTMLImageElement) {
  if (!editorRef.value) return
  const editorRect = editorRef.value.getBoundingClientRect()
  const imgRect = img.getBoundingClientRect()
  const toolbarHeight = 72 // approx height with 2 rows
  let top = imgRect.top - editorRect.top - toolbarHeight - 4
  // If toolbar would go above the editor, show it below the image instead
  if (top < 0) {
    top = imgRect.bottom - editorRect.top + 4
  }
  imageToolbarPos.value = {
    top,
    left: Math.max(0, Math.min(imgRect.left - editorRect.left, editorRect.width - 240))
  }
}

function deselectImage() {
  if (selectedImage.value) {
    delete selectedImage.value.dataset.imgSelected
    selectedImage.value = null
  }
}

function resizeImage(width: number) {
  if (!selectedImage.value) return
  selectedImage.value.style.width = `${width}px`
  selectedImage.value.style.height = 'auto'
  selectedImage.value.setAttribute('width', String(width))
  selectedImage.value.removeAttribute('height')
  imageWidth.value = String(width)
  positionToolbar(selectedImage.value)
  emitUpdate()
}

function applyCustomWidth() {
  const w = parseInt(imageWidth.value)
  if (w && w > 0) resizeImage(w)
}

function alignImage(align: 'left' | 'center' | 'right' | 'inline') {
  if (!selectedImage.value) return
  const img = selectedImage.value
  // Reset previous alignment styles
  img.style.removeProperty('float')
  img.style.removeProperty('display')
  img.style.removeProperty('margin-left')
  img.style.removeProperty('margin-right')
  img.style.removeProperty('margin')

  if (align === 'left') {
    img.style.float = 'left'
    img.style.marginRight = '12px'
    img.style.marginBottom = '8px'
  } else if (align === 'right') {
    img.style.float = 'right'
    img.style.marginLeft = '12px'
    img.style.marginBottom = '8px'
  } else if (align === 'center') {
    img.style.display = 'block'
    img.style.marginLeft = 'auto'
    img.style.marginRight = 'auto'
  }
  // 'inline' = default, no special styles

  positionToolbar(img)
  emitUpdate()
}

function deleteSelectedImage() {
  if (!selectedImage.value) return
  selectedImage.value.remove()
  selectedImage.value = null
  emitUpdate()
}

defineExpose({ insertAtCursor, insertHtmlAtEnd, removeSignature })

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

      <!-- Insert image button -->
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-elevated text-muted hover:text-highlighted transition-colors"
        title="Insert image"
        @mousedown.prevent
        @click="triggerImageInsert"
      >
        <UIcon
          name="i-lucide-image"
          class="text-sm"
        />
      </button>
      <input
        ref="imageInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleImageInsert"
      >
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
    <div class="relative flex-1 min-h-0">
      <div
        ref="editorRef"
        contenteditable="true"
        class="h-full outline-none text-sm px-4 py-3 overflow-y-auto prose prose-sm max-w-none dark:prose-invert"
        :style="{ minHeight }"
        :data-placeholder="placeholder"
        @input="handleInput"
        @paste="handlePaste"
        @click="handleEditorClick"
      />

      <!-- Image resize toolbar -->
      <div
        v-if="selectedImage"
        class="absolute z-50 bg-elevated border border-default rounded-lg shadow-lg px-2 py-1.5 w-56"
        :style="{ top: `${imageToolbarPos.top}px`, left: `${imageToolbarPos.left}px` }"
        @mousedown.prevent
      >
        <!-- Row 1: Size presets + custom width -->
        <div class="flex items-center gap-1 mb-1">
          <button
            class="px-1.5 py-0.5 text-[11px] rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Small (100px)"
            @click="resizeImage(100)"
          >
            S
          </button>
          <button
            class="px-1.5 py-0.5 text-[11px] rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Medium (200px)"
            @click="resizeImage(200)"
          >
            M
          </button>
          <button
            class="px-1.5 py-0.5 text-[11px] rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Large (400px)"
            @click="resizeImage(400)"
          >
            L
          </button>
          <button
            class="px-1.5 py-0.5 text-[11px] rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Extra large (600px)"
            @click="resizeImage(600)"
          >
            XL
          </button>
          <div class="w-px h-4 bg-default mx-0.5" />
          <input
            v-model="imageWidth"
            type="number"
            class="w-12 bg-default rounded px-1 py-0.5 text-[11px] text-center outline-none"
            placeholder="px"
            min="10"
            @keydown.enter="applyCustomWidth"
            @blur="applyCustomWidth"
          >
          <span class="text-[10px] text-muted">px</span>
        </div>
        <!-- Row 2: Alignment + delete/done -->
        <div class="flex items-center gap-1">
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Align left"
            @click="alignImage('left')"
          >
            <UIcon
              name="i-lucide-align-left"
              class="text-xs"
            />
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Center"
            @click="alignImage('center')"
          >
            <UIcon
              name="i-lucide-align-center"
              class="text-xs"
            />
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Align right"
            @click="alignImage('right')"
          >
            <UIcon
              name="i-lucide-align-right"
              class="text-xs"
            />
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Inline (default)"
            @click="alignImage('inline')"
          >
            <UIcon
              name="i-lucide-wrap-text"
              class="text-xs"
            />
          </button>
          <div class="flex-1" />
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-red-500 transition-colors"
            title="Delete image"
            @click="deleteSelectedImage"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="text-xs"
            />
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-default text-muted hover:text-highlighted transition-colors"
            title="Done"
            @click="deselectImage"
          >
            <UIcon
              name="i-lucide-check"
              class="text-xs"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
[contenteditable]:empty::before {
  content: attr(data-placeholder);
  color: var(--ui-text-muted);
  pointer-events: none;
}
</style>

<style>
/* Image selection highlight — unscoped so it works inside contenteditable */
img[data-img-selected] {
  outline: 2px dashed var(--ui-color-primary) !important;
  outline-offset: 3px !important;
  border-radius: 2px;
  cursor: pointer;
}
</style>
