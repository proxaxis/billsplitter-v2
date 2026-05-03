import { onMounted, ref } from 'vue';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const isLoading = ref(false);
  const theme = ref('light');
  const locale = ref('ja-JP');
  const time = ref({
    expression: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
    short: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  });

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    theme.value = t;
  }

  onMounted(() => {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'ja-JP';
    locale.value = systemLocale;
  });

  return { isLoading, theme, locale, time, applyTheme };
});
