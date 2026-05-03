<template>
  <teleport to="body" class="floating-buttons">
    <nav>
      <ul>
        <slot></slot>
      </ul>
    </nav>
  </teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

nav {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 1000;

  ul {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  :slotted(button) {
    width: 3.5rem;
    height: 3.5rem;
    border: none;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background-color: var(--bg-3);
    color: #fff;
    box-shadow: 0 8px 20px var(--shadow);
    cursor: pointer;
    transition:
      transform 0.18s ease,
      filter 0.18s ease;

    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
    }

    &:active {
      transform: translateY(0);
    }

    &:focus-visible {
      outline: 2px solid var(--text-0);
      outline-offset: 2px;
    }

    &:last-child {
      background-color: var(--accent);
    }
  }
}
</style>
