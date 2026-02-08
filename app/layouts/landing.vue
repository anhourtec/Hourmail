<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950 relative">
    <!-- Global subtle gradient background -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div
        class="absolute inset-0"
        style="background: linear-gradient(180deg, var(--color-primary-500 / 0.05) 0%, transparent 40%, transparent 70%, var(--color-primary-500 / 0.03) 100%);"
      />
      <div
        class="absolute top-[10%] -left-[15%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full opacity-25 dark:opacity-15 blur-[60px] md:blur-[180px]"
        style="background: var(--color-primary-500);"
      />
      <div
        class="absolute bottom-[10%] -right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full opacity-15 dark:opacity-10 blur-[50px] md:blur-[160px]"
        style="background: rgb(96 165 250);"
      />
    </div>

    <LandingHeader />
    <main class="flex-1 relative z-[1] pt-[4.5rem]">
      <slot />
    </main>
    <LandingFooter />
    <LandingScrollToTop />
  </div>
</template>
