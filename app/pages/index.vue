<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

// Redirect to last route (or inbox) if authenticated, login if not
const { user } = useAuth()
if (user.value) {
  let target = '/inbox'
  if (import.meta.client) {
    const lastRoute = sessionStorage.getItem('hourinbox_last_route')
    if (lastRoute && lastRoute !== '/') target = lastRoute
  }
  navigateTo(target)
} else {
  navigateTo('/login')
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl text-muted" />
  </div>
</template>
