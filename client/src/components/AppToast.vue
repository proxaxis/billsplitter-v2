<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { registerToastBridge } from '@/utils/toast';
import IconXmark from '@/components/icons/IconXmark.vue';

const toasts = ref([]);
const timers = new Map();

function remove(id) {
  const timerId = timers.get(id);
  if (timerId) {
    clearTimeout(timerId);
    timers.delete(id);
  }
  toasts.value = toasts.value.filter((item) => item.id !== id);
}

function enqueue(kind, text, options = {}) {
  const message = String(text || '');
  if (!message) return;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const duration = Number(options.duration ?? (kind === 'alert' ? 4500 : 2600));

  toasts.value.push({ id, kind, message });

  if (toasts.value.length > 4) {
    remove(toasts.value[0].id);
  }

  if (duration > 0) {
    const timerId = setTimeout(() => remove(id), duration);
    timers.set(id, timerId);
  }
}

function alert(text, options) {
  enqueue('alert', text, options);
}

function message(text, options) {
  enqueue('message', text, options);
}

defineExpose({ alert, message });

let unregisterBridge = null;

onMounted(() => {
  unregisterBridge = registerToastBridge({ alert, message });
});

onBeforeUnmount(() => {
  if (unregisterBridge) unregisterBridge();
  timers.forEach((timerId) => clearTimeout(timerId));
  timers.clear();
});
</script>

<template>
  <teleport to="body">
    <section class="app-toast" aria-live="polite" aria-atomic="true">
      <transition-group name="toast-list" tag="ul">
        <li
          v-for="toastItem in toasts"
          :key="toastItem.id"
          :class="['toast-item', `is-${toastItem.kind}`]"
          :aria-live="toastItem.kind === 'alert' ? 'assertive' : 'polite'"
        >
          <p>{{ toastItem.message }}</p>
          <button type="button" @click="remove(toastItem.id)">
            <IconXmark size="1rem" />
          </button>
        </li>
      </transition-group>
    </section>
  </teleport>
</template>

<style lang="scss" scoped>
.app-toast {
  position: fixed;
  left: 50%;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 2000;
  width: min(24rem, calc(100vw - 2rem));

  ul {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }
}

.toast-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: start;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--bg-1);
  color: var(--text-0);
  box-shadow: 0 8px 20px var(--shadow);
  padding: 0.65rem 0.75rem;

  p {
    margin: 0;
    word-break: break-word;
  }

  button {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1;
    padding: 0.2rem;
  }

  &.is-alert {
    background: var(--danger);
    border-color: var(--danger);
    color: #fff;
  }
}

.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.2s ease;
}

.toast-list-enter-from,
.toast-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
