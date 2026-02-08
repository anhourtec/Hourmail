<script setup lang="ts">
const emit = defineEmits<{
  select: [emoji: string]
}>()

const categories = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐']
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  },
  {
    name: 'Objects',
    emojis: ['📧', '📨', '📩', '📤', '📥', '📦', '📫', '📬', '📭', '📮', '✉️', '📝', '📄', '📃', '📑', '🔖', '📎', '🖇️', '📌', '📍', '📁', '📂', '🗂️', '📅', '📆', '🔒', '🔓', '🔑', '🗝️']
  },
  {
    name: 'Symbols',
    emojis: ['✅', '❌', '⭐', '🌟', '💫', '✨', '🔥', '💯', '⚡', '🎯', '🏆', '🎉', '🎊', '🔔', '🔕', '📢', '📣', '💬', '💭', '🗯️', '♻️', '⚠️', '🚀', '💡', '🔍']
  }
]

const activeCategory = ref(0)
</script>

<template>
  <div class="w-72 bg-elevated border border-default rounded-xl shadow-xl overflow-hidden">
    <!-- Category tabs -->
    <div class="flex border-b border-default px-1 pt-1">
      <button
        v-for="(cat, i) in categories"
        :key="cat.name"
        class="px-2 py-1.5 text-xs rounded-t-md transition-colors"
        :class="activeCategory === i ? 'bg-default font-medium' : 'text-muted hover:text-highlighted'"
        @click="activeCategory = i"
      >
        {{ cat.emojis[0] }}
      </button>
    </div>

    <!-- Emoji grid -->
    <div class="p-2 h-48 overflow-y-auto">
      <p class="text-[10px] text-muted font-medium uppercase tracking-wider px-1 mb-1">
        {{ categories[activeCategory]?.name }}
      </p>
      <div class="grid grid-cols-8 gap-0.5">
        <button
          v-for="emoji in categories[activeCategory]?.emojis"
          :key="emoji"
          class="w-8 h-8 flex items-center justify-center rounded hover:bg-default text-lg transition-colors"
          @click="emit('select', emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>
