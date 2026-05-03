<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ code: '', name: '', symbol: '' }),
  },
});
const emit = defineEmits(['update:modelValue']);

const vmSearchQuery = ref('');
const currencies = ref([]);

// 主要な通貨コード
const MAJOR_CODES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'];

// 検索クエリに基づいて通貨リストをフィルタリングする計算プロパティ
const filteredList = computed(() => {
  const query = vmSearchQuery.value.toLowerCase().trim();
  const list = currencies.value;

  if (!query) {
    const major = list.filter((item) => MAJOR_CODES.includes(item.code));
    const others = list.filter((item) => !MAJOR_CODES.includes(item.code));
    return { major, others };
  }

  // コード、名前の両方で検索可能
  const matched = list.filter((item) => item.code.toLowerCase().includes(query) || item.name.toLowerCase().includes(query));
  return { major: [], others: matched };
});

// 通貨コードから詳細オブジェクトを生成するユーティリティ
const getCurrencyDetail = (code) => {
  // 日本円など、通貨名の取得
  const name = new Intl.DisplayNames([userStore.locale], { type: 'currency' }).of(code);

  // ￥など、通貨記号の取得
  const symbol =
    new Intl.NumberFormat(userStore.locale, {
      style: 'currency',
      currency: code,
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value || code;

  return { code, name, symbol };
};

// ユーザーの環境から初期通貨を推測する
// const getLocalCurrencyCode = () => {
//   try {
//     const nf = new Intl.NumberFormat(userStore.locale, { style: 'currency', currency: 'USD' });
//     return nf.resolvedOptions().currency || 'JPY';
//   } catch {
//     return 'JPY';
//   }
// };

// セレクトボックス変更時のハンドラ
const handleChange = (e) => {
  const selectedCode = e.target.value;
  const detail = getCurrencyDetail(selectedCode);
  emit('update:modelValue', detail);
};

onMounted(() => {
  // ブラウザから全通貨コードを取得
  const codes = Intl.supportedValuesOf('currency');

  // 全通貨の情報をあらかじめ詳細化して保持
  currencies.value = codes.map((code) => getCurrencyDetail(code));

  // 初期値が空の場合、ユーザーの環境に合わせてセット
  if (!props.modelValue || !props.modelValue.code) {
    // const defaultCode = getLocalCurrencyCode();
    const defaultCode = 'JPY'; // とりあえず日本円をデフォルトにしておく
    emit('update:modelValue', getCurrencyDetail(defaultCode));
  }
});
</script>

<template>
  <div class="currency-selector">
    <input v-model="vmSearchQuery" type="text" placeholder="コードまたは名前で検索: 米ドル, USD..." class="search-input" />

    <select :value="modelValue?.code" @change="handleChange" class="select-field">
      <option value="" disabled>通貨を選択してください</option>

      <template v-if="filteredList.major.length > 0">
        <optgroup label="主要な通貨">
          <option v-for="item in filteredList.major" :key="`major-${item.code}`" :value="item.code">
            {{ item.code }} - {{ item.name }} ({{ item.symbol }})
          </option>
        </optgroup>
      </template>

      <optgroup :label="vmSearchQuery ? '検索結果' : 'すべての通貨'">
        <option v-for="item in filteredList.others" :key="item.code" :value="item.code">
          {{ item.code }} - {{ item.name }} ({{ item.symbol }})
        </option>
      </optgroup>
    </select>
  </div>
</template>

<style lang="scss" scoped>
.currency-selector {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
}

optgroup {
  font-weight: bold;
  color: var(--text-1);
}

option {
  color: var(--text-0);
}
</style>
