# Signatures & Database-Persisted Settings

## Overview
Add multiple email signatures (with image support, default selection), persist user settings to PostgreSQL, and integrate signature insertion into compose/reply flows.

## 1. Prisma Schema (`prisma/schema.prisma`)

Add two models after Organization:

```prisma
model UserSettings {
  id                 String      @id @default(uuid())
  email              String      @unique
  pushNotifications  Boolean     @default(true)
  newEmailSound      Boolean     @default(true)
  sendEmailSound     Boolean     @default(true)
  pollInterval       Int         @default(30)
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
  signatures         Signature[]
  @@map("user_settings")
}

model Signature {
  id             String       @id @default(uuid())
  userSettingsId String
  userSettings   UserSettings @relation(fields: [userSettingsId], references: [id], onDelete: Cascade)
  name           String
  body           String       // HTML with inline base64 images
  isDefault      Boolean      @default(false)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  @@map("signatures")
}
```

Run: `npx prisma migrate dev --name add-user-settings-and-signatures`

## 2. API Endpoints (all use `getUserSession(event)` for auth)

| File | Method | Purpose |
|------|--------|---------|
| `server/api/settings/index.get.ts` | GET | Fetch user settings by session email |
| `server/api/settings/index.put.ts` | PUT | Upsert settings (partial update) |
| `server/api/settings/signatures/index.get.ts` | GET | List all signatures for user |
| `server/api/settings/signatures/index.post.ts` | POST | Create signature (auto-default if first) |
| `server/api/settings/signatures/[id].put.ts` | PUT | Update signature (unset others if isDefault=true) |
| `server/api/settings/signatures/[id].delete.ts` | DELETE | Delete signature (reassign default if needed) |

Body size limit: reject `body.length > 512_000` (500KB) for signatures.

## 3. Composable Changes

### `app/composables/useSettings.ts` — Add DB sync
- `loadSettings(email)`: load from localStorage immediately (fast cache), then background `GET /api/settings` to sync from DB
- `updateSetting()`: write localStorage + fire-and-forget `PUT /api/settings`
- No interface changes needed — existing callers work unchanged

### New `app/composables/useSignatures.ts`
- Module-level `signatures` ref (same pattern as useContacts)
- `fetchSignatures(force?)`, `createSignature()`, `updateSignature()`, `deleteSignature()`
- `getDefaultSignature()` — returns first `isDefault` from local array

## 4. ComposeEditor Changes (`app/components/ComposeEditor.vue`)
- Add `insertHtmlAtEnd(html)` method — removes existing `[data-signature]` element, appends new `<div data-signature="true">` at end
- Expose via `defineExpose({ insertAtCursor, insertHtmlAtEnd })`

## 5. Settings Page (`app/pages/settings.vue`)

### New "Signatures" section (between Contacts and Privacy)
- List existing signatures with name, preview text, default badge
- Actions: Set default, Edit, Delete per signature
- "Add signature" button
- Inline editor panel when creating/editing:
  - Name input
  - ComposeEditor (reused) for rich text body
  - "Insert image" button -> hidden file input -> FileReader.readAsDataURL -> append `<img src="data:...">` to body
  - "Set as default" checkbox + Save button

### Privacy & Data section update
Add note: "Settings and signatures are stored in the database" so they persist across sessions/devices.

## 6. Compose Integration

### ComposeModal.vue
- Signature picker button in bottom bar (icon: `i-lucide-pen-line`)
- Dropdown lists all signatures, click to insert via `editorRef.insertHtmlAtEnd(sig.body)`
- "No signature" option to remove
- Auto-insert default signature when composing fresh (body is empty)

### inbox/[id].vue (inline reply)
- Same signature picker button in reply bottom bar
- Auto-insert default signature in `openReply()`/`openReplyAll()` by setting `replyBody` to include `<div data-signature="true">...</div>`
- Add ref to ComposeEditor for `insertHtmlAtEnd` calls

## 7. Bug Fix: Sent emails not appearing in Sent folder

**Root cause**: After SMTP send, the message is never appended to the IMAP Sent folder.

**Fix**:
- `server/utils/imap.ts` — Add `appendToSent()` function mirroring `appendDraft()` pattern
- `server/api/mail/send.post.ts` — After successful SMTP send, build raw RFC 2822 message and call `appendToSent()` (best-effort)

## Critical Files
- `prisma/schema.prisma`
- `server/utils/imap.ts` (add `appendToSent`)
- `server/api/mail/send.post.ts` (append to Sent after SMTP send)
- `app/composables/useSettings.ts`
- `app/composables/useSignatures.ts` (new)
- `app/components/ComposeEditor.vue`
- `app/components/ComposeModal.vue`
- `app/pages/settings.vue`
- `app/pages/inbox/[id].vue`
- 6 new server API files under `server/api/settings/`
