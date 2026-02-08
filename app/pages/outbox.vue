<script setup lang="ts">
definePageMeta({ layout: 'mail', middleware: 'auth' })

const { outboxMessages, retryMessage, removeMessage } = useOutbox()

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'queued': return 'i-lucide-clock'
    case 'sending': return 'i-lucide-loader-2'
    case 'sent': return 'i-lucide-check-circle'
    case 'failed': return 'i-lucide-alert-circle'
    default: return 'i-lucide-circle'
  }
}

const statusColor = (status: string) => {
  switch (status) {
    case 'queued': return 'text-muted'
    case 'sending': return 'text-primary animate-spin'
    case 'sent': return 'text-green-500'
    case 'failed': return 'text-red-500'
    default: return 'text-muted'
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 px-2 sm:px-4 py-1.5 border-b border-default shrink-0">
      <UIcon name="i-lucide-send" class="text-primary text-base ml-1" />
      <h2 class="text-sm font-semibold ml-1">Outbox</h2>
      <div class="flex-1" />
      <span v-if="outboxMessages.length > 0" class="text-xs text-muted hidden sm:inline">
        {{ outboxMessages.length }} {{ outboxMessages.length === 1 ? 'message' : 'messages' }}
      </span>
    </div>

    <!-- Empty -->
    <div v-if="outboxMessages.length === 0" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <UIcon name="i-lucide-send" class="text-5xl text-muted mb-3" />
        <h3 class="text-lg font-medium mb-1">Outbox is empty</h3>
        <p class="text-muted text-sm">Emails being sent will appear here</p>
      </div>
    </div>

    <!-- Message List -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="msg in outboxMessages"
        :key="msg.id"
        class="flex items-center gap-3 px-4 py-3 border-b border-default"
      >
        <!-- Status icon -->
        <UIcon
          :name="statusIcon(msg.status)"
          class="text-lg shrink-0"
          :class="statusColor(msg.status)"
        />

        <!-- Message info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium truncate">{{ msg.to }}</span>
            <span class="text-[10px] text-muted shrink-0 tabular-nums">
              {{ formatTime(msg.queuedAt) }}
            </span>
          </div>
          <p class="text-sm text-muted truncate">{{ msg.subject }}</p>
          <p v-if="msg.error" class="text-xs text-red-500 mt-0.5">{{ msg.error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            v-if="msg.status === 'failed'"
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            size="xs"
            title="Retry"
            @click="retryMessage(msg.id)"
          />
          <UButton
            v-if="msg.status === 'failed' || msg.status === 'sent'"
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="xs"
            title="Remove"
            @click="removeMessage(msg.id)"
          />
          <span
            v-if="msg.status === 'sending'"
            class="text-[10px] text-primary font-medium"
          >
            Sending...
          </span>
          <span
            v-if="msg.status === 'sent'"
            class="text-[10px] text-green-500 font-medium"
          >
            Sent
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
