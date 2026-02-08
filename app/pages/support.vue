<script setup lang="ts">
definePageMeta({ layout: 'landing' })
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
                name="i-lucide-life-buoy"
                class="text-sm"
              />
              Support
            </span>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.15">
            <h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              Get
              <LandingGradientText>Help</LandingGradientText>
            </h1>
          </LandingBlurFade>

          <LandingBlurFade :delay="0.3">
            <p class="mt-8 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Find answers, report issues, or reach out to our team.
            </p>
          </LandingBlurFade>
        </div>
      </div>
    </section>

    <!-- Support Sections -->
    <section class="relative py-8 pb-24">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <!-- Section 1: Bug Reports -->
        <LandingAnimatedSection :delay="0">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
              <span class="text-primary font-extrabold">1.</span>
              I found a bug
            </h2>
            <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Our public issue tracker is located at
                <a
                  href="https://github.com/anhourtec/hourmail/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >github.com/anhourtec/hourmail/issues</a>.
              </p>
              <p>Before opening a new issue, please check for an existing one first. If you find one:</p>
              <ul class="list-disc list-inside space-y-2 pl-2">
                <li>Feel free to add information, or even just a thumbs-up to show your interest.</li>
                <li>
                  Use the <strong class="text-gray-900 dark:text-white">Watch</strong> button to keep yourself informed of updates.
                </li>
              </ul>
              <p>When opening a new issue, try to describe your problem with as much detail as possible — include steps to reproduce, expected vs. actual behavior, and screenshots if applicable.</p>
              <p>
                Keep in mind this is a <strong class="text-gray-900 dark:text-white">public</strong> issue tracker. Any information you post will be visible to everyone. If your issue involves confidential details, please send those separately via email to
                <a
                  href="mailto:support@anhourtec.com"
                  class="text-primary hover:underline"
                >support@anhourtec.com</a> and reference the ticket number.
              </p>
            </div>
          </div>
        </LandingAnimatedSection>

        <!-- Section 2: Feature Requests -->
        <LandingAnimatedSection :delay="50">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
              <span class="text-primary font-extrabold">2.</span>
              I have a feature request
            </h2>
            <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                We'd love to hear your ideas. Feature requests are tracked on the same
                <a
                  href="https://github.com/anhourtec/hourmail/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >public issue tracker</a>.
              </p>
              <ul class="list-disc list-inside space-y-2 pl-2">
                <li>Search existing issues first — someone may have already suggested it. If so, give it a thumbs-up to help us prioritize.</li>
                <li>When opening a new request, describe the problem you're trying to solve and how you'd like it to work.</li>
                <li>We review feature requests regularly and prioritize based on community interest and product direction.</li>
              </ul>
            </div>
          </div>
        </LandingAnimatedSection>

        <!-- Section 3: Confidential Issues -->
        <LandingAnimatedSection :delay="100">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
              <span class="text-primary font-extrabold">3.</span>
              I have a confidential or urgent issue
            </h2>
            <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Please email
                <a
                  href="mailto:support@anhourtec.com"
                  class="text-primary hover:underline"
                >support@anhourtec.com</a>. We'll try to help you as soon as possible.
              </p>
              <ul class="list-disc list-inside space-y-2 pl-2">
                <li>Please describe your problem with as much information as possible.</li>
                <li>Include any relevant details such as your organization domain, email address, and steps to reproduce the issue.</li>
              </ul>
            </div>
          </div>
        </LandingAnimatedSection>

        <!-- Section 4: Questions -->
        <LandingAnimatedSection :delay="150">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
              <span class="text-primary font-extrabold">4.</span>
              I just have questions
            </h2>
            <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Check out our
                <a
                  href="https://github.com/anhourtec/hourmail#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >documentation</a> for setup guides, configuration, and deployment instructions.
              </p>
              <p>
                If you can't find what you're looking for, email us at
                <a
                  href="mailto:support@anhourtec.com"
                  class="text-primary hover:underline"
                >support@anhourtec.com</a>. We're always happy to answer any questions you might have.
              </p>
            </div>
          </div>
        </LandingAnimatedSection>

        <!-- Section 5: Contributing -->
        <LandingAnimatedSection :delay="200">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-start gap-3">
              <span class="text-primary font-extrabold">5.</span>
              I want to contribute
            </h2>
            <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                HourMail is open source and we welcome contributions! Check out our
                <a
                  href="https://github.com/anhourtec/hourmail"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >GitHub repository</a> to get started.
              </p>
              <ul class="list-disc list-inside space-y-2 pl-2">
                <li>Fork the repository and create a feature branch.</li>
                <li>Submit a pull request with a clear description of your changes.</li>
                <li>Report bugs or suggest features through the issue tracker.</li>
              </ul>
            </div>
          </div>
        </LandingAnimatedSection>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative py-24 sm:py-32 border-t border-gray-200/50 dark:border-gray-800/50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <LandingAnimatedSection>
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Ready to try HourMail?
          </h2>
          <p class="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Set up your organization and start using a modern, private email client today.
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
            <NuxtLink
              to="/features"
              class="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
            >
              Explore Features
            </NuxtLink>
          </div>
        </LandingAnimatedSection>
      </div>
    </section>
  </div>
</template>
