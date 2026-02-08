<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })

const { brand } = useAppConfig()
const route = useRoute()
const { login, user } = useAuth()
const isAddAccount = computed(() => route.query.addAccount === 'true')

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await login(email.value, password.value)
    navigateTo('/inbox')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string } }
    error.value = e.data?.message || 'Login failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-default relative">
    <div class="absolute top-5 right-5 z-10">
      <UColorModeButton />
    </div>

    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-elevated">
      <div>
        <div class="flex items-center gap-0.5">
          <img :src="brand.logo" :alt="brand.name" class="w-14 h-14" />
          <span class="text-xl font-bold tracking-tight">{{ brand.name }}</span>
        </div>
      </div>

      <div class="space-y-6 max-w-md">
        <h2 class="text-4xl font-bold leading-tight tracking-tight">
          Your email,<br />your server,<br />your rules.
        </h2>
        <p class="text-muted text-lg leading-relaxed">
          An email client that respects your privacy. No tracking, no ads, no compromises.
        </p>
        <div class="space-y-3 pt-2">
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-shield-check" class="text-green-500 text-base shrink-0" />
            <span class="text-sm text-muted">Passwords never stored — session only</span>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-server" class="text-primary text-base shrink-0" />
            <span class="text-sm text-muted">Connects directly to your IMAP server</span>
          </div>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-code" class="text-primary text-base shrink-0" />
            <span class="text-sm text-muted">Open source</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted">
        Built by {{ brand.author }} &mdash; Open source email client.
      </p>
    </div>

    <!-- Right panel — login form -->
    <div class="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-10">
          <div class="flex items-center justify-center gap-0.5 mb-2">
            <img :src="brand.logo" :alt="brand.name" class="w-14 h-14" />
            <span class="text-xl font-bold tracking-tight">{{ brand.name }}</span>
          </div>
        </div>

        <div class="mb-8">
          <div v-if="isAddAccount" class="mb-4">
            <NuxtLink to="/inbox" class="text-sm text-muted hover:text-highlighted flex items-center gap-1">
              <UIcon name="i-lucide-arrow-left" class="text-xs" />
              Back to inbox
            </NuxtLink>
          </div>
          <h1 class="text-2xl font-bold tracking-tight">{{ isAddAccount ? 'Add account' : 'Sign in' }}</h1>
          <p class="text-muted text-sm mt-1">
            {{ isAddAccount ? 'Sign in to another email account' : 'Enter your email credentials to continue' }}
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <UAlert
            v-if="error"
            color="error"
            :description="error"
            icon="i-lucide-alert-circle"
          />

          <UFormField label="Email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@company.com"
              icon="i-lucide-mail"
              size="xl"
              class="w-full"
              required
              autofocus
            />
          </UFormField>

          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="Your email password"
              icon="i-lucide-lock"
              size="xl"
              class="w-full"
              required
            />
          </UFormField>

          <UButton
            type="submit"
            label="Sign In"
            icon="i-lucide-log-in"
            size="xl"
            block
            :loading="loading"
            class="mt-2"
          />
        </form>

        <!-- Privacy notice (mobile only) -->
        <div class="lg:hidden flex items-start gap-2 mt-6 px-1">
          <UIcon name="i-lucide-shield-check" class="text-green-500 shrink-0 mt-0.5 text-sm" />
          <p class="text-xs text-muted">
            Your password is never stored. It's used only to authenticate with your mail server during this session.
          </p>
        </div>

        <USeparator class="my-6" />

        <p class="text-center text-sm text-muted">
          Organization not set up yet?
          <NuxtLink to="/register" class="text-primary hover:underline font-medium">
            Register your domain
          </NuxtLink>
        </p>

        <!-- Mobile footer -->
        <p class="lg:hidden text-center text-xs text-muted mt-8">
          Built by {{ brand.author }} &mdash; Open source email client.
        </p>
      </div>
    </div>
  </div>
</template>
