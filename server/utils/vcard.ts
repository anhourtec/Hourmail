export interface VCardContact {
  name: string
  email: string
}

/** Parse a vCard (.vcf) string into contacts */
export function parseVCard(vcf: string): VCardContact[] {
  const contacts: VCardContact[] = []
  const blocks = vcf.split('BEGIN:VCARD')

  for (const block of blocks) {
    if (!block.includes('END:VCARD')) continue

    let name = ''
    let email = ''

    const lines = block.split(/\r?\n/)
    for (const line of lines) {
      const upper = line.toUpperCase()
      if (upper.startsWith('FN:') || upper.startsWith('FN;')) {
        name = line.substring(line.indexOf(':') + 1).trim()
      } else if (upper.startsWith('EMAIL:') || upper.startsWith('EMAIL;')) {
        email = line.substring(line.indexOf(':') + 1).trim()
      }
    }

    if (email) {
      contacts.push({ name: name || '', email })
    }
  }

  return contacts
}

/** Parse a CSV string into contacts. Handles name,email or email,name with header detection. */
export function parseCSV(csv: string): VCardContact[] {
  const contacts: VCardContact[] = []
  const lines = csv.split(/\r?\n/).filter(l => l.trim())

  if (lines.length === 0) return contacts

  // Detect header row and column order
  const firstLine = lines[0]!.toLowerCase()
  let nameCol = 0
  let emailCol = 1
  let startRow = 0

  if (firstLine.includes('name') || firstLine.includes('email')) {
    // Has header row
    startRow = 1
    const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('e-mail'))
    const nameIdx = headers.findIndex(h => h.includes('name'))
    if (emailIdx >= 0) emailCol = emailIdx
    if (nameIdx >= 0) nameCol = nameIdx
  } else {
    // No header — detect by checking which column has @
    const cols = firstLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    if (cols[0]?.includes('@')) {
      emailCol = 0
      nameCol = 1
    }
  }

  for (let i = startRow; i < lines.length; i++) {
    const cols = lines[i]!.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    const email = cols[emailCol]?.trim() || ''
    const name = cols[nameCol]?.trim() || ''

    if (email && email.includes('@')) {
      contacts.push({ name, email })
    }
  }

  return contacts
}

/** Generate a vCard 3.0 string from contacts */
export function generateVCard(contacts: VCardContact[]): string {
  return contacts.map(c => {
    const fn = c.name || c.email.split('@')[0] || c.email
    return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${fn}\r\nEMAIL:${c.email}\r\nEND:VCARD`
  }).join('\r\n')
}
