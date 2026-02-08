interface Contact {
  name: string
  address: string
}

const LOCAL_CONTACTS_KEY = 'hourmail_local_contacts'

const contacts = ref<Contact[]>([])
const loading = ref(false)
let fetched = false

/** Load locally saved contacts from localStorage and merge into contacts list */
function loadLocalContacts() {
  if (!import.meta.client) return
  try {
    const stored = localStorage.getItem(LOCAL_CONTACTS_KEY)
    if (!stored) return
    const local: Contact[] = JSON.parse(stored)
    mergeContacts(local)
  } catch { /* ignore */ }
}

/** Merge new contacts into the list, deduplicating by address */
function mergeContacts(newContacts: Contact[]) {
  const existing = new Map(contacts.value.map(c => [c.address.toLowerCase(), c]))
  for (const c of newContacts) {
    const key = c.address.toLowerCase()
    const current = existing.get(key)
    // Prefer entries with a real name over bare addresses
    if (!current || (!current.name && c.name)) {
      existing.set(key, c)
    }
  }
  contacts.value = [...existing.values()].sort((a, b) =>
    (a.name || a.address).localeCompare(b.name || b.address)
  )
}

/** Persist locally-added contacts to localStorage */
function persistLocalContacts(added: Contact[]) {
  if (!import.meta.client) return
  try {
    const stored = localStorage.getItem(LOCAL_CONTACTS_KEY)
    const existing: Contact[] = stored ? JSON.parse(stored) : []
    const map = new Map(existing.map(c => [c.address.toLowerCase(), c]))
    for (const c of added) {
      const key = c.address.toLowerCase()
      if (!map.has(key) || (!map.get(key)!.name && c.name)) {
        map.set(key, c)
      }
    }
    localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify([...map.values()]))
  } catch { /* ignore */ }
}

/**
 * Parse a comma-separated address string into contacts.
 * Handles formats: "Name <email>" and bare "email"
 */
function parseAddresses(addressStr: string): Contact[] {
  if (!addressStr) return []
  const results: Contact[] = []
  const parts = addressStr.split(',').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    const match = part.match(/^(.+?)\s*<(.+?)>$/)
    if (match) {
      results.push({ name: match[1]!.trim(), address: match[2]!.trim() })
    } else if (part.includes('@')) {
      results.push({ name: '', address: part.trim() })
    }
  }
  return results
}

export function useContacts() {
  async function fetchContacts(force = false) {
    if (fetched && !force) return
    loading.value = true
    try {
      const data = await $fetch<{ contacts: Contact[] }>('/api/mail/contacts')
      contacts.value = data.contacts
      fetched = true
      // Merge any locally saved contacts (from sent emails not yet in IMAP)
      loadLocalContacts()
    } catch {
      // If server fetch fails, still load local contacts
      loadLocalContacts()
    } finally {
      loading.value = false
    }
  }

  /** Add recipients from a sent email to the contacts list */
  function addSentContacts(to: string, cc?: string, bcc?: string) {
    const newContacts = [
      ...parseAddresses(to),
      ...parseAddresses(cc || ''),
      ...parseAddresses(bcc || '')
    ]
    if (newContacts.length === 0) return
    mergeContacts(newContacts)
    persistLocalContacts(newContacts)
  }

  function searchContacts(query: string): Contact[] {
    if (!query || query.length < 1) return []
    const q = query.toLowerCase()
    return contacts.value
      .filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      .slice(0, 8)
  }

  /** Export all contacts as a .vcf file download */
  async function exportContacts() {
    // Pass localStorage contacts as query param so server can merge them
    let localParam = ''
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(LOCAL_CONTACTS_KEY)
        if (stored) localParam = `?local=${encodeURIComponent(stored)}`
      } catch { /* ignore */ }
    }

    const blob = await $fetch<Blob>(`/api/mail/contacts/export${localParam}`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts.vcf'
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Import contacts from a .vcf or .csv file */
  async function importContacts(file: File): Promise<number> {
    const form = new FormData()
    form.append('file', file)

    const data = await $fetch<{ imported: number, contacts: Contact[] }>('/api/mail/contacts/import', {
      method: 'POST',
      body: form
    })

    // Merge imported contacts into current state and persist to localStorage
    mergeContacts(data.contacts)
    persistLocalContacts(data.contacts)

    return data.imported
  }

  return {
    contacts,
    loading,
    fetchContacts,
    searchContacts,
    addSentContacts,
    exportContacts,
    importContacts
  }
}
