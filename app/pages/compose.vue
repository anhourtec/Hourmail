<script setup lang="ts">
// Redirect /compose to inbox and open the compose modal
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { openCompose } = useCompose()

onMounted(() => {
  openCompose({
    to: (route.query.to as string) || '',
    subject: (route.query.subject as string) || '',
    body: (route.query.body as string) || '',
    inReplyTo: (route.query.inReplyTo as string) || undefined
  })
  navigateTo('/inbox?compose=new', { replace: true })
})
</script>

<template>
  <div />
</template>
