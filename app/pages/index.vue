<script setup lang="ts">
definePageMeta({ layout: false })

const { user } = useAuth()

onMounted(() => {
  navigateTo(user.value ? '/inbox' : '/login')
})
</script>

<template>
  <div />
</template>
