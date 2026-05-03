<script setup>
import { useUserStore } from '@/stores/user';
import { computed } from 'vue';

const userStore = useUserStore();

const props = defineProps({
  tz: {
    type: String,
    required: true,
    default: 'UTC',
  },
  utc: {
    type: String,
    default: null,
  },
});

// タイムゾーンに基づいたフォーマット済みの日時文字列を生成
const displayedDateTime = computed(() => {
  // utc が null なら new Date() (現在時刻)、あればそれをパース
  const date = props.utc ? new Date(props.utc) : new Date();

  // 無効な日付の場合は空文字を返す
  if (isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(userStore.locale, {
      // year: 'numeric',
      // month: '2-digit',
      // day: '2-digit',
      // hour: '2-digit',
      // minute: '2-digit',
      // second: '2-digit',
      // hour12: false,
      ...userStore.time.expression,
      timeZone: props.tz ?? 'UTC',
    }).format(date);
  } catch (e) {
    console.error('Invalid TimeZone:', props.tz);
    return date.toISOString();
  }
});
</script>

<template>
  <span class="datetime-ribbon">
    {{ displayedDateTime }}
  </span>
</template>

<style lang="scss" scoped>
.datetime-ribbon {
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}
</style>
