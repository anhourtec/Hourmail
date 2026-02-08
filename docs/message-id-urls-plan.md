# Message-ID URLs & Compose URL Sync

## Change 1: Use Email Message-ID in URLs

**Problem:** URLs show raw numeric UIDs (`/inbox/92`) which look like sequential numbers.

**Solution:** Use the email's RFC 2822 Message-ID (from IMAP envelope), base64url-encoded, as the URL slug. Keep UIDs internally for all IMAP operations.

**Example:** `/inbox/92` → `/inbox/Q0FCeCtYSld4QG1haWwuZ21haWwuY29t`

### Files to modify

| # | File | Change |
|---|------|--------|
| 1 | `app/utils/messageId.ts` (NEW) | `encodeMessageId()`, `decodeMessageId()`, `isNumericUid()` |
| 2 | `server/utils/messageId.ts` (NEW) | Server copy of `decodeMessageId()`, `isNumericUid()` |
| 3 | `server/utils/imap.ts` | Add `messageId` to `MailMessage` interface, extract from `msg.envelope.messageId`, add `findUidByMessageId()` |
| 4 | `app/composables/useMail.ts` | Add `messageId` to client interface, update `fetchMessage` to handle slug or UID |
| 5 | `server/api/mail/messages/[uid].get.ts` | Accept both numeric UID and base64url Message-ID slug |
| 6 | `app/pages/inbox/[uid].vue` → `app/pages/inbox/[id].vue` | Rename route, resolve Message-ID → UID |
| 7 | `app/pages/inbox/index.vue` | NuxtLink uses `encodeMessageId(msg.messageId) \|\| msg.uid` |
| 8 | `app/pages/folders/[name].vue` | Same NuxtLink update |

### How Message-ID encoding works

```
Input:  <CABx+XJWx@mail.gmail.com>
Strip:  CABx+XJWx@mail.gmail.com
Base64url: Q0FCeCtYSld4QG1haWwuZ21haWwuY29t
URL:    /inbox/Q0FCeCtYSld4QG1haWwuZ21haWwuY29t
```

### Resolution flow on detail page

1. **From message list** (fast path): Messages list already has UID + messageId. Detail page finds UID from `messages.value` by matching decoded messageId → calls API with numeric UID.
2. **Direct URL / bookmark** (slow path): Detail page can't find UID in loaded messages → API endpoint calls `findUidByMessageId()` which does IMAP `SEARCH HEADER Message-ID <...>` → returns the message.
3. **Fallback**: Messages without a Message-ID use numeric UID in URL. `isNumericUid()` check on the detail page and API handles both formats.

### Backwards compatibility

Old URLs like `/inbox/92` continue to work — `isNumericUid()` detects numeric params and uses them directly as UIDs.

---

## Change 2: Compose Syncs with URL (`?compose=new`)

**Problem:** Opening compose doesn't reflect in the URL. Users can't bookmark or share a "compose" state.

**Solution:** Bidirectional sync between `composeState` and `?compose=new` query param.

### Files to modify

| # | File | Change |
|---|------|--------|
| 1 | `app/composables/useCompose.ts` | Add `initUrlSync()` with watchers for state↔URL sync |
| 2 | `app/layouts/mail.vue` | Call `initUrlSync()` in setup |
| 3 | `app/pages/compose.vue` | Update redirect |

### Sync behavior

- `openCompose()` → watcher adds `?compose=new` to current URL via `router.replace()`
- `closeCompose()` → watcher removes `compose` query param
- Page load with `?compose=new` → opens compose modal
- Browser back/forward → watched `route.query.compose` updates state
- Minimized state keeps `?compose=new` (compose is still active)
- Uses `router.replace()` so open/close doesn't pollute history stack

### Edge cases handled

- Other query params preserved (e.g. `?folder=Sent&compose=new`)
- SSR guard: `import.meta.client` check
- Duplicate watcher prevention: `urlSyncInitialized` flag

---

## Verification

1. Click message from inbox → URL shows `/inbox/<base64url-slug>` not `/inbox/92`
2. Bookmark that URL, close tab, reopen → message loads correctly
3. Old URL `/inbox/92` still works (backwards compat)
4. Message without Message-ID falls back to numeric UID in URL
5. Click Compose → URL adds `?compose=new`
6. Close compose → `?compose=new` removed from URL
7. Load page with `?compose=new` → compose modal opens
8. Minimize compose → `?compose=new` stays in URL
