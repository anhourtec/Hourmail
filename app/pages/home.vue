<script setup lang="ts">
definePageMeta({ layout: 'landing' })

const features = [
  { icon: 'i-lucide-layout-dashboard', title: 'Modern UI', desc: 'Clean, fast interface with dark mode, keyboard shortcuts, and a polished experience.' },
  { icon: 'i-lucide-server', title: 'Any IMAP Server', desc: 'Connect to any standard IMAP/SMTP server. Gmail, Outlook, self-hosted — it all works.' },
  { icon: 'i-lucide-shield-check', title: 'Self-Hosted & Private', desc: 'Deploy on your own infrastructure. Your emails never pass through third-party servers.' },
  { icon: 'i-lucide-users', title: 'Multi-Account', desc: 'Switch between multiple email accounts seamlessly. One interface, all your inboxes.' },
  { icon: 'i-lucide-file-edit', title: 'Real-time Drafts', desc: 'Auto-saving drafts synced to your IMAP server. Pick up where you left off, anywhere.' },
  { icon: 'i-lucide-smartphone', title: 'Mobile Friendly', desc: 'Fully responsive design that works beautifully on phones, tablets, and desktops.' }
]

const steps = [
  { num: '01', icon: 'i-lucide-building', title: 'Register your organization', desc: 'Admin sets up the domain with IMAP/SMTP server settings. One-time setup for the whole team.' },
  { num: '02', icon: 'i-lucide-log-in', title: 'Users sign in', desc: 'Team members log in with their existing email credentials. No new passwords to remember.' },
  { num: '03', icon: 'i-lucide-mail-check', title: 'Modern email, instantly', desc: 'Start using a fast, modern email client right away. All your folders, contacts, and mail — ready.' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="aurora-bg" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32 lg:pt-40 pb-20 sm:pb-32">
        <div class="max-w-4xl mx-auto text-center">
          <LandingBlurFade :delay="0">
            <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mb-8">
              <UIcon
                name="i-lucide-code"
                class="text-sm"
              />
              Open Source Email Client
            </span>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.15">
            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              Your email,
              <br>
              <LandingGradientText>your server,</LandingGradientText>
              <br>
              your rules.
            </h1>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.3">
            <p class="mt-8 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              A modern, self-hosted email client that connects directly to your IMAP server. No tracking, no ads, no compromises — just email done right.
            </p>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.45">
            <div class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
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
              <NuxtLink
                to="/features"
                class="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              >
                View Features
              </NuxtLink>
            </div>
          </LandingBlurFade>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingAnimatedSection class="text-center mb-20">
          <div class="section-divider mx-auto mb-6" />
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Up and running in minutes
          </h2>
          <p class="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Three steps to a modern email experience for your entire team.
          </p>
        </LandingAnimatedSection>

        <div class="grid md:grid-cols-3 gap-12 lg:gap-16">
          <LandingAnimatedSection
            v-for="step in steps"
            :key="step.title"
            :delay="parseInt(step.num) * 100"
          >
            <div class="text-center">
              <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 transition-all duration-300 hover:scale-110 hover:bg-primary/15">
                <UIcon
                  :name="step.icon"
                  class="text-2xl text-primary"
                />
              </div>
              <span class="text-xs font-bold text-primary uppercase tracking-widest">Step {{ step.num }}</span>
              <h3 class="text-xl font-bold mt-3 mb-3 text-gray-900 dark:text-white">
                {{ step.title }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
                {{ step.desc }}
              </p>
            </div>
          </LandingAnimatedSection>
        </div>
      </div>
    </section>

    <!-- Key Features -->
    <section class="relative py-24 sm:py-32 border-y border-gray-200/50 dark:border-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingAnimatedSection class="text-center mb-20">
          <div class="section-divider mx-auto mb-6" />
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Everything you need
          </h2>
          <p class="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Built for teams who care about privacy and want a modern email experience.
          </p>
        </LandingAnimatedSection>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
          <LandingAnimatedSection
            v-for="(feature, i) in features"
            :key="feature.title"
            :delay="i * 80"
          >
            <div class="group">
              <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                <UIcon
                  :name="feature.icon"
                  class="text-xl text-primary"
                />
              </div>
              <h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-white">
                {{ feature.title }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
                {{ feature.desc }}
              </p>
            </div>
          </LandingAnimatedSection>
        </div>
      </div>
    </section>

    <!-- Open Source CTA -->
    <section class="relative py-24 sm:py-32">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <LandingAnimatedSection>
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <UIcon
              name="i-lucide-heart"
              class="text-3xl text-primary"
            />
          </div>
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Free, Open Source, Forever
          </h2>
          <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            HourMail is MIT licensed. Run it on your own servers, modify it to your needs, contribute back to the community. No vendor lock-in, ever.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/anhourtec/hourmail"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-7 py-3.5 rounded-full font-semibold text-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
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
          </div>
        </LandingAnimatedSection>
      </div>
    </section>
  </div>
</template>
