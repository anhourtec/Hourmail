export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData[0]!
  const content = file.data.toString('utf-8')
  const filename = (file.filename || '').toLowerCase()

  let parsed: VCardContact[]

  if (filename.endsWith('.csv')) {
    parsed = parseCSV(content)
  } else {
    // Default to vCard parsing (.vcf or unknown)
    parsed = parseVCard(content)
  }

  if (parsed.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid contacts found in file' })
  }

  // Deduplicate by email
  const seen = new Set<string>()
  const contacts = parsed.filter(c => {
    const key = c.email.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    imported: contacts.length,
    contacts: contacts.map(c => ({ name: c.name, address: c.email }))
  }
})
