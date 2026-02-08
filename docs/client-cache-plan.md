# Client-Side Folder Cache & Stale Data Fix

## Problems
1. **Slow folder switching** — every Inbox→Sent→Inbox switch re-fetches from API (even though server Redis cache has 30s TTL, there's still network latency + IMAP connection overhead on cache miss)
2. **Stale data flash** — `currentFolder` updates immediately but `messages` still holds old folder's data until fetch completes, so sidebar highlights "Inbox" while Sent messages are still visible
3. **No user control** — no setting to toggle caching behavior

## Solution: In-Memory Stale-While-Revalidate Cache

### Files to modify

| File | Change |
|------|--------|
| `app/composables/useMail.ts` | Add cache Map, rewrite `fetchMessages`, add cache invalidation to mutations |
| `app/pages/settings.vue` | Add "Performance" card with cache toggle + clear button |
| `app/pages/inbox/index.vue` | Pass `forceRefresh: true` on refresh button |
| `app/pages/folders/[name].vue` | Pass `forceRefresh: true` on refresh button |

### Step 1: Add cache structures to `useMail.ts`

Add at module scope:
```ts
interface CachedPage {
  messages: MailMessage[]
  total: number
  fetchedAt: number
}

const messageCache = new Map<string, CachedPage>()  // key: "folder:page"
const clientCacheEnabled = ref(true)
const currentPage = ref(1)
let cacheInitialized = false
```

Initialize from cookie inside `useMail()` (first call only):
```ts
if (!cacheInitialized && import.meta.client) {
  const cookie = useCookie<boolean>('hourmail_cache_enabled', { default: () => true })
  clientCacheEnabled.value = cookie.value
  cacheInitialized = true
}
```

### Step 2: Rewrite `fetchMessages`

New signature: `fetchMessages(folder, page, forceRefresh = false)`

Flow:
1. On folder switch: **immediately** clear `messages.value = []` and `totalMessages.value = 0` (fixes stale flash)
2. Set `currentFolder.value = folder` and `currentPage.value = page`
3. If cache enabled + cache hit + not forceRefresh:
   - Set `messages.value` from cache instantly (no loading spinner)
   - Background-refresh via `.then()` — update `messages.value` + cache only if user is still on the same folder
4. If cache miss or forceRefresh: show loading spinner, fetch, cache result

Race condition guard: `if (currentFolder.value === folder)` before applying response.

### Step 3: Update mutation functions

- `deleteEmail` → add `invalidateFolderCache(folder)` (clears all pages for that folder since indices shift)
- `toggleRead` / `toggleStarred` → add `updateCurrentPageCache()` after optimistic flag update
- `sendEmail` → find sent folder via `folders.value.find(f => f.specialUse === '\\Sent')` and invalidate its cache

Helper functions:
```ts
function invalidateFolderCache(folder: string) {
  for (const key of messageCache.keys()) {
    if (key.startsWith(`${folder}:`)) messageCache.delete(key)
  }
}
function clearMessageCache() { messageCache.clear() }
function setClientCacheEnabled(enabled: boolean) {
  clientCacheEnabled.value = enabled
  if (!enabled) messageCache.clear()
}
function updateCurrentPageCache() {
  if (!clientCacheEnabled.value) return
  messageCache.set(`${currentFolder.value}:${currentPage.value}`, {
    messages: [...messages.value],
    total: totalMessages.value,
    fetchedAt: Date.now()
  })
}
```

### Step 4: Update page components

- `inbox/index.vue` refresh button: `fetchMessages('INBOX', page, true)`
- `folders/[name].vue` refresh button: `fetchMessages(folderPath, page, true)`

### Step 5: Settings UI

Add a "Performance" section to `settings.vue`:
- **USwitch** for "Client-side folder cache" — persists to `hourmail_cache_enabled` cookie (24h maxAge)
- **"Clear cache" button** — calls `clearMessageCache()`
- Description: "Cache messages in memory for instant folder switching. Data is cleared on logout or page refresh."

## Cache invalidation matrix

| Action | Invalidation |
|--------|-------------|
| Delete message | All pages for that folder |
| Send email | Sent folder pages |
| Toggle read/star | Snapshot current page |
| Refresh button | Force-refetch, update cache |
| Disable setting | Clear entire cache |
| Logout/refresh | Automatic (memory gone) |

## Verification
1. Switch Inbox→Sent→Inbox — second Inbox load should be instant
2. No stale flash — Sent messages should NOT appear when switching to Inbox
3. Delete a message → switch away → switch back — deleted message should not reappear
4. Toggle the setting off in Settings — folder switching should always show loading spinner
5. Clear cache button — next folder load should fetch fresh
