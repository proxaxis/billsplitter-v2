<script setup>
import { useUserStore } from '@/stores/user';
import IconSun from '@/components/icons/IconSun.vue';
import IconMoon from '@/components/icons/IconMoon.vue';

const userStore = useUserStore();

function toggleTheme() {
  const newTheme = userStore.theme === 'light' ? 'dark' : 'light';
  userStore.applyTheme(newTheme);
}
</script>

<template>
  <header class="app-header">
    <h1><router-link :to="{ name: 'IndexPage' }">立替精算アプリ</router-link></h1>
    <nav>
      <ul>
        <slot></slot>
        <li><button @click="toggleTheme"><component :is="userStore.theme === 'light' ? IconMoon : IconSun" /></button></li>
      </ul>
    </nav>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  height: var(--header-height);
  background-color: var(--bg-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  width: calc(100% - 2rem);
}

ul {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
  align-items: center;
}

li {
  button, :slotted(button), :slotted(a) {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icons, :slotted(.icons) {
    &:hover {
      transform: scale(1.1);
    }
  }
}
</style>
