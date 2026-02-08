interface Contact {
  name: string
  address: string
}

const contacts = ref<Contact[]>([])
const loading = ref(false)
let fetched = false

export function useContacts() {
  async function fetchContacts(force = false) {
    if (fetched && !force) return
    loading.value = true
    try {
      const data = await $fetch<{ contacts: Contact[] }>('/api/mail/contacts')
      contacts.value = data.contacts
      fetched = true
    } catch {
      // ignore
    } finally {
      loading.value = false
    }
  }

  function searchContacts(query: string): Contact[] {
    if (!query || query.length < 1) return []
    const q = query.toLowerCase()
    return contacts.value
      .filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      .slice(0, 8)
  }

  return {
    contacts,
    loading,
    fetchContacts,
    searchContacts
  }
}
