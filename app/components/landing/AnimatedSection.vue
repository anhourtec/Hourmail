<script setup lang="ts">
const props = withDefaults(defineProps<{
  animation?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  delay?: number
  duration?: number
  tag?: string
  threshold?: number
}>(), {
  animation: 'slide-up',
  delay: 0,
  duration: 600,
  tag: 'div',
  threshold: 0.1
})

const elementRef = ref<HTMLElement | null>(null)
const isVisible = ref(false)

onMounted(() => {
  if (!elementRef.value) return

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        isVisible.value = true
        observer.disconnect()
      }
    },
    { threshold: props.threshold }
  )

  observer.observe(elementRef.value)

  onUnmounted(() => observer.disconnect())
})

const delayInSeconds = computed(() => props.delay / 1000)
const durationInSeconds = computed(() => props.duration / 1000)
</script>

<template>
  <component
    :is="tag"
    ref="elementRef"
    class="animated-section"
    :class="[
      `animated-section--${animation}`,
      { 'animated-section--visible': isVisible }
    ]"
    :style="{
      '--anim-delay': `${delayInSeconds}s`,
      '--anim-duration': `${durationInSeconds}s`
    }"
  >
    <slot :is-visible="isVisible" />
  </component>
</template>

<style scoped>
.animated-section {
  transition:
    opacity var(--anim-duration, 0.6s) ease-out var(--anim-delay, 0s),
    transform var(--anim-duration, 0.6s) ease-out var(--anim-delay, 0s),
    filter var(--anim-duration, 0.6s) ease-out var(--anim-delay, 0s);
}

.animated-section--fade {
  opacity: 0;
}
.animated-section--fade.animated-section--visible {
  opacity: 1;
}

.animated-section--slide-up {
  opacity: 0;
  transform: translateY(24px);
}
.animated-section--slide-up.animated-section--visible {
  opacity: 1;
  transform: translateY(0);
}

.animated-section--slide-down {
  opacity: 0;
  transform: translateY(-24px);
}
.animated-section--slide-down.animated-section--visible {
  opacity: 1;
  transform: translateY(0);
}

.animated-section--slide-left {
  opacity: 0;
  transform: translateX(24px);
}
.animated-section--slide-left.animated-section--visible {
  opacity: 1;
  transform: translateX(0);
}

.animated-section--slide-right {
  opacity: 0;
  transform: translateX(-24px);
}
.animated-section--slide-right.animated-section--visible {
  opacity: 1;
  transform: translateX(0);
}

@media (max-width: 768px) {
  .animated-section {
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animated-section {
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }
}
</style>
