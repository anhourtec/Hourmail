<script setup lang="ts">
definePageMeta({ layout: false })

const { brand } = useAppConfig()

const name = ref('')
const domain = ref('')
const imapHost = ref('')
const imapPort = ref(993)
const smtpHost = ref('')
const smtpPort = ref(465)
const useSslTls = ref(true)
const useStarttls = ref(false)
const rejectUnauthorized = ref(true)
const error = ref('')
const success = ref(false)
const loading = ref(false)

const tlsMode = computed(() => {
  if (useSslTls.value) return 'tls'
  if (useStarttls.value) return 'starttls'
  return 'none'
})

watch(useSslTls, (on) => {
  if (on) {
    useStarttls.value = false
    if (imapPort.value === 143) imapPort.value = 993
    if (smtpPort.value === 587) smtpPort.value = 465
  }
})

watch(useStarttls, (on) => {
  if (on) {
    useSslTls.value = false
    if (imapPort.value === 993) imapPort.value = 143
    if (smtpPort.value === 465) smtpPort.value = 587
  }
})

async function handleRegister() {
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/org/register', {
      method: 'POST',
      body: {
        name: name.value,
        domain: domain.value,
        imapHost: imapHost.value,
        imapPort: imapPort.value,
        smtpHost: smtpHost.value,
        smtpPort: smtpPort.value,
        tlsMode: tlsMode.value,
        rejectUnauthorized: rejectUnauthorized.value
      }
    })
    success.value = true
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e.data?.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-default relative">
    <!-- Top bar -->
    <div class="absolute top-5 left-5 z-10">
      <UButton
        to="/login"
        label="Sign In"
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm"
      />
    </div>
    <div class="absolute top-5 right-5 z-10">
      <UColorModeButton />
    </div>

    <!-- Left panel — form -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-6">
          <div class="flex items-center justify-center gap-0.5 mb-2">
            <img
              :src="brand.logo"
              :alt="brand.name"
              class="w-14 h-14"
            >
            <span class="text-xl font-bold tracking-tight">{{ brand.name }}</span>
          </div>
        </div>

        <!-- Success State -->
        <div
          v-if="success"
          class="text-center py-8"
        >
          <UIcon
            name="i-lucide-check-circle-2"
            class="text-green-500 text-5xl mb-4"
          />
          <h2 class="text-xl font-semibold mb-2">
            Organization Registered!
          </h2>
          <p class="text-muted mb-2">
            Users with <strong>@{{ domain }}</strong> email addresses can now sign in.
          </p>
          <p class="text-xs text-muted mb-6">
            IMAP and SMTP connections verified successfully.
          </p>
          <UButton
            to="/login"
            label="Go to Login"
            icon="i-lucide-log-in"
            size="lg"
          />
        </div>

        <!-- Registration Form -->
        <template v-else>
          <div class="mb-5">
            <h1 class="text-xl font-bold tracking-tight">
              Register your domain
            </h1>
            <p class="text-muted text-sm mt-1">
              Configure your organization's mail server
            </p>
          </div>

          <form
            class="space-y-3.5"
            @submit.prevent="handleRegister"
          >
            <UAlert
              v-if="error"
              color="error"
              :description="error"
              icon="i-lucide-alert-circle"
            />

            <!-- Organization section -->
            <div class="space-y-3">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">
                Organization
              </h2>

              <UFormField
                label="Organization Name"
                required
              >
                <UInput
                  v-model="name"
                  placeholder="Anhourtec"
                  icon="i-lucide-building-2"
                  size="lg"
                  class="w-full"
                  required
                  autofocus
                />
              </UFormField>

              <UFormField
                label="Email Domain"
                required
                hint="e.g. anhourtec.com"
              >
                <UInput
                  v-model="domain"
                  placeholder="anhourtec.com"
                  icon="i-lucide-globe"
                  size="lg"
                  class="w-full"
                  required
                />
              </UFormField>
            </div>

            <USeparator />

            <!-- IMAP section -->
            <div class="space-y-3">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">
                IMAP — Incoming Mail
              </h2>

              <div class="grid grid-cols-3 gap-3">
                <UFormField
                  label="Host"
                  required
                  class="col-span-2"
                >
                  <UInput
                    v-model="imapHost"
                    placeholder="imap.gmail.com"
                    size="lg"
                    class="w-full"
                    required
                  />
                </UFormField>
                <UFormField label="Port">
                  <UInput
                    v-model="imapPort"
                    type="number"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>

            <USeparator />

            <!-- SMTP section -->
            <div class="space-y-3">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">
                SMTP — Outgoing Mail
              </h2>

              <div class="grid grid-cols-3 gap-3">
                <UFormField
                  label="Host"
                  required
                  class="col-span-2"
                >
                  <UInput
                    v-model="smtpHost"
                    placeholder="smtp.gmail.com"
                    size="lg"
                    class="w-full"
                    required
                  />
                </UFormField>
                <UFormField label="Port">
                  <UInput
                    v-model="smtpPort"
                    type="number"
                    size="lg"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>

            <USeparator />

            <!-- Security settings -->
            <div class="space-y-3">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-muted">
                Security
              </h2>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">
                    Use SSL/TLS
                  </p>
                  <p class="text-xs text-muted">
                    Ports 993 / 465 (recommended)
                  </p>
                </div>
                <USwitch v-model="useSslTls" />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">
                    Use STARTTLS
                  </p>
                  <p class="text-xs text-muted">
                    Ports 143 / 587
                  </p>
                </div>
                <USwitch v-model="useStarttls" />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">
                    Reject Invalid Certificates
                  </p>
                  <p class="text-xs text-muted">
                    Disable for self-signed certs
                  </p>
                </div>
                <USwitch v-model="rejectUnauthorized" />
              </div>
            </div>

            <UButton
              type="submit"
              :label="loading ? 'Testing connections...' : 'Register Organization'"
              icon="i-lucide-building-2"
              size="lg"
              block
              :loading="loading"
            />
          </form>

          <!-- Privacy notice (mobile only) -->
          <div class="lg:hidden flex items-start gap-2 mt-4 px-1">
            <UIcon
              name="i-lucide-shield-check"
              class="text-green-500 shrink-0 mt-0.5 text-sm"
            />
            <p class="text-xs text-muted">
              Only IMAP/SMTP connection settings are stored. User passwords are never saved.
            </p>
          </div>

          <USeparator class="my-6" />

          <p class="text-center text-sm text-muted">
            Already registered?
            <NuxtLink
              to="/login"
              class="text-primary hover:underline font-medium"
            >
              Sign in
            </NuxtLink>
          </p>

          <!-- Mobile footer -->
          <p class="lg:hidden text-center text-xs text-muted mt-8">
            Built by {{ brand.author }} &mdash; Open source email client.
          </p>
        </template>
      </div>
    </div>

    <!-- Right panel — branding -->
    <div class="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 bg-elevated">
      <div>
        <div class="flex items-center gap-0.5">
          <img
            :src="brand.logo"
            :alt="brand.name"
            class="w-14 h-14"
          >
          <span class="text-xl font-bold tracking-tight">{{ brand.name }}</span>
        </div>
      </div>

      <div class="space-y-6 max-w-md">
        <h2 class="text-4xl font-bold leading-tight tracking-tight">
          Set up your<br>organization<br>in minutes.
        </h2>
        <p class="text-muted text-lg leading-relaxed">
          Connect your mail server and let your team start using {{ brand.name }} right away.
        </p>
        <div class="space-y-3 pt-2">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-zap"
              class="text-primary text-base shrink-0"
            />
            <span class="text-sm text-muted">Connections tested automatically</span>
          </div>
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-users"
              class="text-primary text-base shrink-0"
            />
            <span class="text-sm text-muted">All domain users can sign in instantly</span>
          </div>
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-shield-check"
              class="text-green-500 text-base shrink-0"
            />
            <span class="text-sm text-muted">Passwords are never stored</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted">
        Built by {{ brand.author }} &mdash; Open source email client.
      </p>
    </div>
  </div>
</template>
