<script setup>
import { computed } from 'vue';
import { useGroupStore } from '@/stores/group';
import { useUserStore } from '@/stores/user';

const groupStore = useGroupStore();
const userStore = useUserStore();

const props = defineProps({
  value: {
    type: Number,
    required: true,
    default: 0,
  },
});

// グループ設定の通貨コードをもとに、金額を通貨形式で表示する計算プロパティ
const formattedValue = computed(() => {
  const amount = Number(props.value);
  return new Intl.NumberFormat(userStore.locale, {
    style: 'currency',
    currency: groupStore.g.currency.code,
    currencyDisplay: 'symbol',
  }).format(amount);
});
</script>

<template>
  <span class="currency-ribbon">
    {{ formattedValue }}
  </span>
</template>
