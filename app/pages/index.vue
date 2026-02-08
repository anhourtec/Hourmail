<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

// Redirect to inbox if authenticated, login if not (middleware handles redirect)
const { user } = useAuth()
if (user.value) {
  navigateTo('/inbox')
} else {
  navigateTo('/login')
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <UIcon
      name="i-lucide-loader-2"
      class="animate-spin text-2xl text-muted"
    />
  </div>
</template>
