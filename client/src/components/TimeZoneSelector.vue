<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
});
const emit = defineEmits(['update:modelValue']);

const vmSearchQuery = ref('');
const timeZones = ref([]);

// 主要なタイムゾーン
const MAJOR_TIMEZONES = ['UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London', 'Asia/Shanghai', 'Europe/Paris'];

// 検索フィルタリングロジック
const filteredTimeZones = computed(() => {
  const query = vmSearchQuery.value.toLowerCase().trim();

  // 主要なタイムゾーン（検索中は含めない、または全体から探す）
  if (!query) {
    // 未入力時は「主要」+「それ以外」の順で表示
    const others = timeZones.value.filter((tz) => !MAJOR_TIMEZONES.includes(tz));
    return { major: MAJOR_TIMEZONES, others };
  }

  // 検索中
  const matched = timeZones.value.filter((tz) => tz.toLowerCase().includes(query));
  return { major: [], others: matched };
});

const updateValue = (e) => {
  emit('update:modelValue', e.target.value);
};

onMounted(() => {
  // 全タイムゾーンを取得
  timeZones.value = Intl.supportedValuesOf('timeZone');

  // ユーザーの現在地をデフォルト値としてセット
  if (!props.modelValue) {
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    emit('update:modelValue', userTZ);
  }
});
</script>

<template>
  <div class="timezone-selector">
    <input id="tz-search" v-model="vmSearchQuery" type="text" placeholder="タイムゾーンを検索: Tokyo, London..." class="search-input" />

    <select :value="modelValue" @change="updateValue" class="tz-select">
      <template v-if="filteredTimeZones.major.length > 0">
        <optgroup label="主要なタイムゾーン">
          <option v-for="tz in filteredTimeZones.major" :key="`major-${tz}`" :value="tz">
            {{ tz }}
          </option>
        </optgroup>
      </template>

      <optgroup :label="vmSearchQuery ? '検索結果' : 'すべてのタイムゾーン'">
        <option v-for="tz in filteredTimeZones.others" :key="tz" :value="tz">
          {{ tz }}
        </option>
      </optgroup>
    </select>
  </div>
</template>

<style scoped>
.timezone-selector {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

optgroup {
  font-weight: bold;
  color: var(--text-1);
}

option {
  color: var(--text-0);
}
</style>
