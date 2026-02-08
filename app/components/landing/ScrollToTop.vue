<script setup lang="ts">
const isVisible = ref(false)
const scrollProgress = ref(0)

function checkScroll() {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
  scrollProgress.value = Math.min(100, Math.max(0, progress))
  isVisible.value = scrollTop > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', checkScroll, { passive: true })
  checkScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkScroll)
})
</script>

<template>
  <ClientOnly>
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <button
        v-if="isVisible"
        aria-label="Scroll to top"
        class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary transition-all duration-200 hover:scale-110 cursor-pointer"
        @click="scrollToTop"
      >
        <!-- Circular progress indicator -->
        <svg
          class="absolute inset-0 w-12 h-12 -rotate-90"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            class="stroke-gray-200 dark:stroke-gray-700"
            stroke-width="2"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            class="stroke-primary transition-all duration-150 ease-out"
            stroke-width="2"
            stroke-linecap="round"
            :stroke-dasharray="2 * Math.PI * 22"
            :stroke-dashoffset="2 * Math.PI * 22 - (scrollProgress / 100) * 2 * Math.PI * 22"
          />
        </svg>
        <!-- Arrow icon -->
        <svg
          class="w-4 h-4 relative z-10"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </Transition>
  </ClientOnly>
</template>
