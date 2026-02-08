<template>
  <span class="gradient-text">
    <slot />
  </span>
</template>

<style>
@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.gradient-text {
  background: linear-gradient(135deg, var(--color-primary-500), rgb(96 165 250), rgb(139 92 246));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 6s ease infinite;
}
</style>
