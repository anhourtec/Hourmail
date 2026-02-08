<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const toast = useToast()
const { contacts, loading, fetchContacts, exportContacts, importContacts } = useContacts()
const searchQuery = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const exporting = ref(false)

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contacts.value
  const q = searchQuery.value.toLowerCase()
  return contacts.value.filter(
    c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  )
})

async function handleExport() {
  exporting.value = true
  try {
    await exportContacts()
  } catch {
    toast.add({ title: 'Failed to export contacts', color: 'error' })
  } finally {
    exporting.value = false
  }
}

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = '' // reset so same file can be re-selected

  try {
    const count = await importContacts(file)
    toast.add({ title: `Imported ${count} contact${count === 1 ? '' : 's'}`, color: 'success' })
  } catch {
    toast.add({ title: 'Failed to import contacts', color: 'error' })
  }
}

onMounted(() => {
  fetchContacts(true)
})
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-2xl mx-auto p-4 sm:p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold">
          Contacts
        </h1>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-upload"
            variant="ghost"
            color="neutral"
            size="xs"
            title="Import contacts"
            @click="fileInput?.click()"
          />
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            color="neutral"
            size="xs"
            :loading="exporting"
            title="Export contacts"
            @click="handleExport"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            size="xs"
            :loading="loading"
            @click="fetchContacts(true)"
          />
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".vcf,.csv"
        class="hidden"
        @change="handleFileSelected"
      >

      <p class="text-sm text-muted mb-4">
        Addresses collected from your sent and received emails.
      </p>

      <!-- Search -->
      <div class="mb-4">
        <div class="flex items-center bg-elevated rounded-lg px-3 py-2">
          <UIcon
            name="i-lucide-search"
            class="text-muted mr-2 shrink-0"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search contacts..."
            class="flex-1 bg-transparent text-sm outline-none"
          >
          <button
            v-if="searchQuery"
            class="text-muted hover:text-highlighted ml-2"
            @click="searchQuery = ''"
          >
            <UIcon
              name="i-lucide-x"
              class="text-sm"
            />
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div
        v-if="loading && contacts.length === 0"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-muted text-lg mr-2"
        />
        <span class="text-sm text-muted">Collecting contacts from your mailbox...</span>
      </div>

      <!-- Empty -->
      <div
        v-else-if="contacts.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-lucide-contact"
          class="text-3xl text-muted mb-2"
        />
        <p class="text-sm text-muted">
          No contacts found.
        </p>
        <p class="text-xs text-muted mt-1">
          Contacts are collected from your sent and received emails.
        </p>
      </div>

      <!-- No search results -->
      <div
        v-else-if="filteredContacts.length === 0"
        class="text-center py-12"
      >
        <p class="text-sm text-muted">
          No contacts matching "{{ searchQuery }}"
        </p>
      </div>

      <!-- Contact list -->
      <div
        v-else
        class="divide-y divide-default"
      >
        <div
          v-for="contact in filteredContacts"
          :key="contact.address"
          class="flex items-center gap-3 py-3"
        >
          <UAvatar
            :alt="contact.name || contact.address"
            size="sm"
          />
          <div class="min-w-0 flex-1">
            <p
              v-if="contact.name"
              class="text-sm font-medium truncate"
            >
              {{ contact.name }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ contact.address }}
            </p>
          </div>
        </div>
      </div>

      <p
        v-if="filteredContacts.length > 0"
        class="text-xs text-muted mt-4 text-center"
      >
        {{ filteredContacts.length }} contact{{ filteredContacts.length === 1 ? '' : 's' }}
      </p>
    </div>
  </div>
</template>
