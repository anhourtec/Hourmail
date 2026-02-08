<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const { user, accounts, fetchAccounts, switchAccount, switchingAccount } = useAuth()
const { clientCacheEnabled, setClientCacheEnabled, clearMessageCache } = useMail()
const { settings, updateSetting, loadSettings } = useSettings()
const { notificationPermission, requestPermission, playSendEmailSound, playNewEmailSound } = useNotifications()
onMounted(() => {
  if (user.value?.email) loadSettings(user.value.email)
  fetchAccounts()
})

function handleCacheToggle(enabled: boolean) {
  setClientCacheEnabled(enabled)
  const cookie = useCookie('hourinbox_cache_enabled', { default: () => true, maxAge: 60 * 60 * 24 })
  cookie.value = enabled
}

function handleClearCache() {
  clearMessageCache()
}

function handleToggle(key: 'pushNotifications' | 'newEmailSound' | 'sendEmailSound', value: boolean) {
  if (!user.value?.email) return
  updateSetting(user.value.email, key, value)
}

async function handleEnableNotifications() {
  const granted = await requestPermission()
  if (granted && user.value?.email) {
    updateSetting(user.value.email, 'pushNotifications', true)
  }
}

function handlePollInterval(value: string) {
  if (!user.value?.email) return
  updateSetting(user.value.email, 'pollInterval', parseInt(value) || 30)
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-2xl mx-auto p-4 sm:p-6 pb-12">
      <h1 class="text-xl font-bold mb-6">Settings</h1>

      <!-- Accounts -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-users" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">Accounts</h2>
        </div>

        <div class="space-y-0 divide-y divide-default">
          <div
            v-for="account in accounts"
            :key="account.email"
            class="flex items-center gap-3 py-3"
          >
            <UAvatar :alt="account.email" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" :class="account.active ? 'text-primary' : ''">
                {{ account.email }}
              </p>
              <p class="text-xs text-muted truncate">{{ account.organization }}</p>
            </div>
            <span
              v-if="account.active"
              class="text-[11px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full"
            >
              Active
            </span>
            <UButton
              v-else
              label="Switch"
              variant="soft"
              color="neutral"
              size="xs"
              :loading="switchingAccount"
              @click="switchAccount(account.email)"
            />
          </div>

          <div class="py-3">
            <UButton
              to="/login?addAccount=true"
              label="Add another account"
              icon="i-lucide-plus"
              variant="soft"
              color="neutral"
              size="xs"
            />
          </div>
        </div>
      </section>

      <!-- Notifications & Sounds -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-bell" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">Notifications & Sounds</h2>
        </div>

        <div class="space-y-0 divide-y divide-default">
          <!-- Push Notifications -->
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Push notifications</p>
              <p class="text-xs text-muted mt-0.5">Get browser notifications when new emails arrive.</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <UButton
                v-if="notificationPermission === 'default'"
                label="Enable"
                size="xs"
                variant="soft"
                @click="handleEnableNotifications"
              />
              <span
                v-else-if="notificationPermission === 'denied'"
                class="text-xs text-red-500 font-medium"
              >
                Blocked by browser
              </span>
              <template v-else>
                <span class="text-xs font-medium" :class="settings.pushNotifications ? 'text-green-500' : 'text-muted'">
                  {{ settings.pushNotifications ? 'On' : 'Off' }}
                </span>
                <USwitch
                  :model-value="settings.pushNotifications"
                  @update:model-value="handleToggle('pushNotifications', $event)"
                />
              </template>
            </div>
          </div>

          <!-- New Email Sound -->
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">New email sound</p>
              <p class="text-xs text-muted mt-0.5">Play a sound when new emails are detected.</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button
                class="text-muted hover:text-highlighted p-1 rounded hover:bg-elevated transition-colors"
                title="Preview sound"
                @click="playNewEmailSound(true)"
              >
                <UIcon name="i-lucide-volume-2" class="text-base" />
              </button>
              <span class="text-xs font-medium" :class="settings.newEmailSound ? 'text-green-500' : 'text-muted'">
                {{ settings.newEmailSound ? 'On' : 'Off' }}
              </span>
              <USwitch
                :model-value="settings.newEmailSound"
                @update:model-value="handleToggle('newEmailSound', $event)"
              />
            </div>
          </div>

          <!-- Send Email Sound -->
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Send email sound</p>
              <p class="text-xs text-muted mt-0.5">Play a sound when an email is sent successfully.</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button
                class="text-muted hover:text-highlighted p-1 rounded hover:bg-elevated transition-colors"
                title="Preview sound"
                @click="playSendEmailSound(true)"
              >
                <UIcon name="i-lucide-volume-2" class="text-base" />
              </button>
              <span class="text-xs font-medium" :class="settings.sendEmailSound ? 'text-green-500' : 'text-muted'">
                {{ settings.sendEmailSound ? 'On' : 'Off' }}
              </span>
              <USwitch
                :model-value="settings.sendEmailSound"
                @update:model-value="handleToggle('sendEmailSound', $event)"
              />
            </div>
          </div>

          <!-- Poll Interval -->
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Check for new emails</p>
              <p class="text-xs text-muted mt-0.5">How often to poll your mail server for new messages.</p>
            </div>
            <select
              :value="settings.pollInterval"
              class="bg-elevated border border-default rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
              @change="handlePollInterval(($event.target as HTMLSelectElement).value)"
            >
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Performance -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-gauge" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">Performance</h2>
        </div>

        <div class="space-y-0 divide-y divide-default">
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Client-side folder cache</p>
              <p class="text-xs text-muted mt-0.5">Cache message lists for instant folder switching.</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-xs font-medium" :class="clientCacheEnabled ? 'text-green-500' : 'text-muted'">
                {{ clientCacheEnabled ? 'On' : 'Off' }}
              </span>
              <USwitch
                :model-value="clientCacheEnabled"
                @update:model-value="handleCacheToggle"
              />
            </div>
          </div>

          <div v-if="clientCacheEnabled" class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Clear cache</p>
              <p class="text-xs text-muted mt-0.5">Force fresh data on next folder load.</p>
            </div>
            <UButton
              label="Clear"
              icon="i-lucide-trash-2"
              variant="soft"
              color="neutral"
              size="xs"
              @click="handleClearCache"
            />
          </div>
        </div>
      </section>

      <!-- Contacts -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-contact" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">Contacts</h2>
        </div>

        <div class="space-y-0 divide-y divide-default">
          <div class="flex items-center justify-between gap-4 py-3">
            <div>
              <p class="text-sm font-medium">Collected contacts</p>
              <p class="text-xs text-muted mt-0.5">Addresses are collected from your sent and received emails for autocomplete.</p>
            </div>
            <UButton
              label="View contacts"
              icon="i-lucide-arrow-right"
              variant="soft"
              color="neutral"
              size="xs"
              to="/contacts"
            />
          </div>
        </div>
      </section>

      <!-- Privacy & Data -->
      <section class="mb-8">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-shield-check" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">Privacy & Data</h2>
        </div>

        <div class="space-y-3 text-sm text-muted">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-lock" class="text-green-500 shrink-0 mt-0.5" />
            <p><strong class="text-highlighted">Your password is never stored.</strong> It is used only for the current session to authenticate with your mail server and is discarded when you log out.</p>
          </div>
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-database" class="text-green-500 shrink-0 mt-0.5" />
            <p><strong class="text-highlighted">No email data is stored.</strong> Emails are fetched directly from your IMAP server on each request. We only store your organization's IMAP/SMTP connection settings.</p>
          </div>
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-eye-off" class="text-green-500 shrink-0 mt-0.5" />
            <p><strong class="text-highlighted">We cannot read your emails.</strong> All communication happens directly between your browser session and your mail server. HourInbox is a pass-through interface.</p>
          </div>
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-clock" class="text-green-500 shrink-0 mt-0.5" />
            <p><strong class="text-highlighted">Sessions expire in 24 hours.</strong> After that, all session data is automatically deleted from memory.</p>
          </div>
        </div>
      </section>

      <!-- About -->
      <section>
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-info" class="text-muted" />
          <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">About HourInbox</h2>
        </div>

        <div class="space-y-2 text-sm text-muted">
          <p>HourInbox is a modern, open-source web email client built by <strong class="text-highlighted">Anhourtec</strong>.</p>
        </div>

      </section>
    </div>
  </div>
</template>
