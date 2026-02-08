<script setup lang="ts">
withDefaults(defineProps<{
  delay?: number
  duration?: number
  yOffset?: number
  blur?: string
  tag?: string
}>(), {
  delay: 0,
  duration: 0.6,
  yOffset: 6,
  blur: '6px',
  tag: 'div'
})

const isVisible = ref(false)
const elementRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!elementRef.value) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { threshold: 0.1 }
  )

  observer.observe(elementRef.value)

  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <component
    :is="tag"
    ref="elementRef"
    class="blur-fade-element"
    :class="{ 'blur-fade-visible': isVisible }"
    :style="{
      '--blur-fade-delay': `${0.04 + delay}s`,
      '--blur-fade-duration': `${duration}s`,
      '--blur-fade-y': `${yOffset}px`,
      '--blur-fade-blur': blur
    }"
  >
    <slot />
  </component>
</template>

<style scoped>
.blur-fade-element {
  opacity: 0;
  transform: translateY(var(--blur-fade-y, 6px));
  filter: blur(var(--blur-fade-blur, 6px));
  transition:
    opacity var(--blur-fade-duration, 0.6s) ease-out var(--blur-fade-delay, 0.04s),
    transform var(--blur-fade-duration, 0.6s) ease-out var(--blur-fade-delay, 0.04s),
    filter var(--blur-fade-duration, 0.6s) ease-out var(--blur-fade-delay, 0.04s);
}

.blur-fade-visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0px);
}

@media (max-width: 768px) {
  .blur-fade-element {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .blur-fade-element {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }
}
</style>
