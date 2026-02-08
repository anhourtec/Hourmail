<script setup lang="ts">
const { brand } = useAppConfig()
const { navLinks, authLinks } = useLandingNavigation()
const route = useRoute()

const scrolled = ref(false)
const mobileMenuOpen = ref(false)

const onScroll = () => {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

watch(() => route.path, closeMobileMenu)
</script>

<template>
  <header
    class="fixed left-0 right-0 top-0 z-50 w-full transition-all duration-300"
    :class="scrolled
      ? 'border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl backdrop-saturate-150 shadow-sm'
      : 'border-b border-transparent bg-transparent'"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-[4.5rem] items-center justify-between">
      <!-- Logo -->
      <NuxtLink
        to="/home"
        class="flex items-center gap-1.5 z-50 group"
      >
        <div class="transform transition-all duration-300 group-hover:scale-105">
          <img
            :src="brand.logo"
            :alt="brand.name"
            class="w-10 h-10"
          >
        </div>
        <span class="text-xl font-bold text-gray-900 dark:text-white">{{ brand.name }}</span>
      </NuxtLink>

      <!-- Desktop Navigation -->
      <nav class="hidden lg:flex items-center gap-1">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="relative px-4 py-2 text-[15px] font-medium transition-all duration-200 rounded-lg"
          :class="route.path === link.to || (link.to === '/home' && route.path === '/')
            ? 'text-gray-900 dark:text-white bg-gray-100/80 dark:bg-gray-800/50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/50'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Right Side -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <UColorModeButton />

        <!-- Auth Links (Desktop) -->
        <NuxtLink
          to="/login"
          class="hidden lg:inline-flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800/50"
        >
          Log in
        </NuxtLink>
        <NuxtLink
          to="/register"
          class="hidden lg:inline-flex items-center relative bg-primary text-white px-5 py-2.5 rounded-full font-semibold transition-all duration-300 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] overflow-hidden group active:scale-[0.98]"
        >
          <span class="relative z-10 flex items-center gap-2">
            Get Started
          </span>
          <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
        </NuxtLink>

        <!-- Mobile Menu Button -->
        <button
          class="lg:hidden relative text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/50 transition-all duration-200 active:scale-95 cursor-pointer"
          :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg
            v-if="!mobileMenuOpen"
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="3"
              y1="6"
              x2="21"
              y2="6"
            />
            <line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            />
            <line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
            />
          </svg>
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileMenuOpen"
        class="lg:hidden border-t border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg shadow-lg"
      >
        <nav class="max-w-7xl mx-auto px-4 py-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <!-- Primary Links -->
          <div class="mb-4">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-all"
              :class="route.path === link.to || (link.to === '/home' && route.path === '/')
                ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="closeMobileMenu"
            >
              {{ link.label }}
            </NuxtLink>
          </div>

          <!-- Auth Links (Mobile) -->
          <div class="pt-4 space-y-3 border-t border-gray-200 dark:border-gray-800">
            <NuxtLink
              v-for="link in authLinks"
              :key="link.to"
              :to="link.to"
              class="block text-center px-6 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
              :class="link.primary
                ? 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'"
              @click="closeMobileMenu"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </nav>
      </div>
    </Transition>
  </header>
</template>
