export interface Signature {
  id: string
  name: string
  body: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

const signatures = ref<Signature[]>([])
const loading = ref(false)
let fetched = false

export function useSignatures() {
  async function fetchSignatures(force = false) {
    if (!force && fetched) return
    loading.value = true
    try {
      const data = await $fetch<Signature[]>('/api/settings/signatures')
      signatures.value = data
      fetched = true
    } catch {
      // silent
    } finally {
      loading.value = false
    }
  }

  async function createSignature(name: string, body: string, isDefault = false) {
    const sig = await $fetch<Signature>('/api/settings/signatures', {
      method: 'POST',
      body: { name, body, isDefault }
    })
    // If new sig is default, unset others locally
    if (sig.isDefault) {
      signatures.value.forEach(s => s.isDefault = false)
    }
    signatures.value.push(sig)
    return sig
  }

  async function updateSignature(id: string, data: Partial<Pick<Signature, 'name' | 'body' | 'isDefault'>>) {
    const updated = await $fetch<Signature>(`/api/settings/signatures/${id}`, {
      method: 'PUT',
      body: data
    })
    // If updated sig is now default, unset others locally
    if (updated.isDefault) {
      signatures.value.forEach(s => s.isDefault = s.id === updated.id)
    }
    const idx = signatures.value.findIndex(s => s.id === id)
    if (idx >= 0) signatures.value[idx] = updated
    return updated
  }

  async function deleteSignature(id: string) {
    await $fetch(`/api/settings/signatures/${id}`, { method: 'DELETE' })
    const idx = signatures.value.findIndex(s => s.id === id)
    const wasDefault = idx >= 0 && signatures.value[idx]!.isDefault
    if (idx >= 0) signatures.value.splice(idx, 1)
    // Reassign default locally
    if (wasDefault && signatures.value.length > 0) {
      signatures.value[0]!.isDefault = true
    }
  }

  function getDefaultSignature(): Signature | undefined {
    return signatures.value.find(s => s.isDefault)
  }

  return {
    signatures,
    loading,
    fetchSignatures,
    createSignature,
    updateSignature,
    deleteSignature,
    getDefaultSignature
  }
}
