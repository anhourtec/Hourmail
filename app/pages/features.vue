<script setup lang="ts">
definePageMeta({ layout: 'landing' })

const highlights = [
  {
    icon: 'i-lucide-building',
    title: 'Organization-First Setup',
    desc: 'An admin registers the domain once with IMAP and SMTP credentials. From there, every user on that domain can sign in with their existing email password — no extra accounts, no invitations.',
    bullets: ['One-time admin configuration', 'Domain-based auto-discovery', 'Unlimited users per organization']
  },
  {
    icon: 'i-lucide-mail',
    title: 'Modern Mail Experience',
    desc: 'Rich compose with inline formatting, threaded conversations, attachment previews, and auto-saving drafts. Everything you expect from a modern email client, without the bloat.',
    bullets: ['Rich text compose with toolbar', 'Inline reply and forward', 'Attachment view and download', 'Auto-saving drafts to IMAP']
  },
  {
    icon: 'i-lucide-zap',
    title: 'Fast & Cached',
    desc: 'Redis-powered server-side caching, client-side caching with background refresh, and preloading of all folders. Switching between mailboxes is instant.',
    bullets: ['Redis server-side caching', 'Client-side cache with background refresh', 'Background folder preloading', 'Instant mailbox switching']
  },
  {
    icon: 'i-lucide-lock',
    title: 'Secure by Design',
    desc: 'Passwords are never stored — used only for IMAP session auth. HTML is sanitized with DOMPurify, connections use TLS/STARTTLS, and self-signed certificates are supported.',
    bullets: ['No password storage — session only', 'DOMPurify XSS sanitization', 'TLS/STARTTLS connections', 'Self-signed certificate support']
  }
]

const allFeatures = [
  { icon: 'i-lucide-star', title: 'Starred Messages', desc: 'Flag important emails and access them from a dedicated view.' },
  { icon: 'i-lucide-folder', title: 'Full Folder Support', desc: 'Navigate all your IMAP folders with message and unread counts.' },
  { icon: 'i-lucide-search', title: 'Advanced Search', desc: 'Search by from, to, subject with prefix syntax and advanced filters.' },
  { icon: 'i-lucide-users', title: 'Multi-Account', desc: 'Add multiple email accounts and switch between them seamlessly.' },
  { icon: 'i-lucide-moon', title: 'Dark Mode', desc: 'Beautiful dark and light themes that follow your system preference.' },
  { icon: 'i-lucide-file-edit', title: 'Draft Auto-Save', desc: 'Drafts save automatically to localStorage and your IMAP server.' },
  { icon: 'i-lucide-contact', title: 'Contacts', desc: 'Auto-collected contacts from your email history with instant search.' },
  { icon: 'i-lucide-container', title: 'Docker Ready', desc: 'Deploy with Docker and docker-compose. Production-ready configuration included.' },
  { icon: 'i-lucide-code', title: 'Open Source', desc: 'MIT licensed. Inspect, modify, and contribute. No vendor lock-in.' },
  { icon: 'i-lucide-bell', title: 'Notifications', desc: 'Browser push notifications and sound alerts for new emails.' },
  { icon: 'i-lucide-send', title: 'Outbox Queue', desc: 'Reliable sending with retry logic and status tracking.' },
  { icon: 'i-lucide-smartphone', title: 'Responsive Design', desc: 'Fully functional on mobile, tablet, and desktop devices.' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="aurora-bg" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 lg:pt-40 pb-16 sm:pb-24">
        <div class="max-w-4xl mx-auto text-center">
          <LandingBlurFade :delay="0">
            <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mb-8">
              <UIcon
                name="i-lucide-sparkles"
                class="text-sm"
              />
              Features
            </span>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.15">
            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              Built for teams who
              <br>
              <LandingGradientText>own their email</LandingGradientText>
            </h1>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.3">
            <p class="mt-8 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              A self-hosted email client with the features you need and the privacy you deserve. No compromises.
            </p>
          </LandingBlurFade>
        </div>
      </div>
    </section>

    <!-- Feature Highlights — alternating layout -->
    <section class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-36">
        <LandingAnimatedSection
          v-for="(item, i) in highlights"
          :key="item.title"
          :animation="i % 2 === 0 ? 'slide-right' : 'slide-left'"
          :delay="100"
        >
          <div
            class="flex flex-col gap-12 lg:gap-20 items-center"
            :class="i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'"
          >
            <!-- Icon -->
            <div class="shrink-0">
              <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-primary/10 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:bg-primary/15">
                <UIcon
                  :name="item.icon"
                  class="text-5xl sm:text-6xl text-primary"
                />
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 text-center lg:text-left">
              <h3 class="text-2xl sm:text-3xl lg:text-4xl font-bold mb-5 text-gray-900 dark:text-white">
                {{ item.title }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-8">
                {{ item.desc }}
              </p>
              <ul class="space-y-3">
                <li
                  v-for="bullet in item.bullets"
                  :key="bullet"
                  class="flex items-center gap-3 text-gray-600 dark:text-gray-400 justify-center lg:justify-start"
                >
                  <svg
                    class="w-5 h-5 text-green-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {{ bullet }}
                </li>
              </ul>
            </div>
          </div>
        </LandingAnimatedSection>
      </div>
    </section>

    <!-- Full Feature Grid -->
    <section class="relative py-24 sm:py-32 border-y border-gray-200/50 dark:border-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingAnimatedSection class="text-center mb-20">
          <div class="section-divider mx-auto mb-6" />
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            And so much more
          </h2>
          <p class="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Every feature is designed to make email work the way it should.
          </p>
        </LandingAnimatedSection>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
          <LandingAnimatedSection
            v-for="(feature, i) in allFeatures"
            :key="feature.title"
            :delay="i * 60"
          >
            <div class="flex items-start gap-5 group">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                <UIcon
                  :name="feature.icon"
                  class="text-lg text-primary"
                />
              </div>
              <div>
                <h3 class="font-bold mb-1.5 text-gray-900 dark:text-white">
                  {{ feature.title }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {{ feature.desc }}
                </p>
              </div>
            </div>
          </LandingAnimatedSection>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative py-24 sm:py-32">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <LandingAnimatedSection>
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Ready to upgrade your email?
          </h2>
          <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Set up your organization in minutes and give your team the email client they deserve.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NuxtLink
              to="/register"
              class="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98] group"
            >
              Get Started
              <svg
                class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </NuxtLink>
            <a
              href="https://github.com/anhourtec/hourmail"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-7 py-3.5 rounded-full font-semibold text-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            >
              <svg
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </LandingAnimatedSection>
      </div>
    </section>
  </div>
</template>
