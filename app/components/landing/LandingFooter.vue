<script setup lang="ts">
const { brand } = useAppConfig()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative border-t border-gray-200/50 dark:border-gray-800/50 mt-auto bg-white dark:bg-gray-950">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <!-- Top Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
        <!-- Brand Column (span 2) -->
        <div class="col-span-2">
          <NuxtLink
            to="/home"
            class="inline-flex items-center gap-1.5 mb-4"
          >
            <img
              :src="brand.logo"
              :alt="brand.name"
              class="w-10 h-10"
            >
            <span class="text-xl font-bold text-gray-900 dark:text-white">{{ brand.name }}</span>
          </NuxtLink>
          <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 max-w-xs">
            Open source email client for teams. Your email, your server, your rules.
          </p>
          <!-- Social Links -->
          <div class="flex items-center gap-2">
            <a
              href="https://github.com/anhourtec/hourmail"
              target="_blank"
              rel="noopener noreferrer"
              class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="GitHub"
            >
              <svg
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>

        <!-- Product -->
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-widest">
            Product
          </h4>
          <ul class="space-y-3">
            <li>
              <NuxtLink
                to="/home"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Home
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/features"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Features
              </NuxtLink>
            </li>
            <li>
              <a
                href="https://github.com/anhourtec/hourmail"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>

        <!-- Resources -->
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-widest">
            Resources
          </h4>
          <ul class="space-y-3">
            <li>
              <NuxtLink
                to="/support"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Support
              </NuxtLink>
            </li>
            <li>
              <a
                href="https://github.com/anhourtec/hourmail#readme"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Documentation
              </a>
            </li>
            <li>
              <a
                href="mailto:support@anhourtec.com"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>

        <!-- Company -->
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white mb-4 text-xs uppercase tracking-widest">
            Company
          </h4>
          <ul class="space-y-3">
            <li>
              <a
                href="https://anhourtec.com"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                About Anhourtec
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p class="text-xs text-gray-600 dark:text-gray-400">
          &copy; {{ year }} {{ brand.name }}. All rights reserved.
        </p>
        <a
          href="https://anhourtec.com"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Built by {{ brand.author }}
        </a>
      </div>
    </div>
  </footer>
</template>
