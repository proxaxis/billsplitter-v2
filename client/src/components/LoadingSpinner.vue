<script setup>
const props = defineProps({
  msg: {
    type: String,
    default: 'Loading...',
  },
});
</script>

<template>
  <teleport class="loading-spinner" to="body">
    <div class="container">
      <div class="spinner"></div>
      <p v-if="msg !== ''">{{ msg }}</p>
    </div>
  </teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

.container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: color-mix(in srgb, var(--bg-0) 85%, transparent);

  .spinner {
    margin: 2rem auto;
    border: 4px solid var(--border);
    border-top: 4px solid var(--accent);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-top: 40vh;
  }
  p {
    text-align: center;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
