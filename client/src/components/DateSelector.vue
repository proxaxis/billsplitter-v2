<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  min: {
    type: String,
    default: '',
  },
  timezone: {
    type: String,
    default: () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  },
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const vmDraftDate = ref('');

function pad(value) {
  return String(value).padStart(2, '0');
}

function getSafeTimeZone() {
  try {
    if (props.timezone) {
      new Intl.DateTimeFormat('en-US', { timeZone: props.timezone });
      return props.timezone;
    }
  } catch (e) {
    // fallback to UTC
  }

  return 'UTC';
}

function getDatePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

function getTimeZoneOffsetMillis(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const second = Number(parts.find((part) => part.type === 'second')?.value);

  const asUtcMillis = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtcMillis - date.getTime();
}

function toInputDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const timeZone = getSafeTimeZone();
  return getDatePartsInTimeZone(date, timeZone);
}

function toDisplayDate(value) {
  const inputValue = toInputDate(value);
  if (!inputValue) return '日付を選択';

  const [year, month, day] = inputValue.split('-');
  return `${year}/${month}/${day}`;
}

function toIsoUtc(value) {
  if (!value) return '';

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';

  const timeZone = getSafeTimeZone();
  const localMidnightUtcBasis = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utcMillis = localMidnightUtcBasis;

  for (let i = 0; i < 3; i += 1) {
    const offsetMillis = getTimeZoneOffsetMillis(new Date(utcMillis), timeZone);
    const nextUtcMillis = localMidnightUtcBasis - offsetMillis;
    if (nextUtcMillis === utcMillis) break;
    utcMillis = nextUtcMillis;
  }

  return new Date(utcMillis).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const displayValue = computed(() => toDisplayDate(props.modelValue));
const minInputDate = computed(() => toInputDate(props.min));

watch(
  () => props.timezone,
  (newTimeZone, oldTimeZone) => {
    if (newTimeZone === oldTimeZone) return;

    emit('update:modelValue', '');
    if (!isOpen.value) return;
    vmDraftDate.value = '';
  },
);

function openModal() {
  vmDraftDate.value = toInputDate(props.modelValue);
  isOpen.value = true;
}

function closeModal() {
  isOpen.value = false;
}

function clearDate() {
  emit('update:modelValue', '');
  closeModal();
}

function applyDate() {
  const iso = toIsoUtc(vmDraftDate.value);
  if (!iso) return;

  emit('update:modelValue', iso);
  closeModal();
}
</script>

<template>
  <div class="date-selector">
    <button type="button" class="date-selector__trigger" @click="openModal">
      {{ displayValue }}
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="date-selector__backdrop" @click="closeModal">
        <div class="date-selector__modal" role="dialog" aria-modal="true" aria-label="日付選択" @click.stop>
          <p class="date-selector__title">日付を選択</p>
          <input v-model="vmDraftDate" type="date" class="date-selector__input" :min="minInputDate || undefined" />

          <div class="date-selector__actions">
            <button type="button" @click="closeModal">キャンセル</button>
            <button type="button" @click="clearDate">クリア</button>
            <button type="button" class="date-selector__apply" @click="applyDate">決定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.date-selector {
  width: 100%;
}

.date-selector__trigger {
  width: 100%;
  text-align: left;
}

.date-selector__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
  z-index: 80;
}

.date-selector__modal {
  width: min(26rem, 100%);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--bg-0);
  box-shadow: 0 0.7rem 1.5rem var(--shadow);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.date-selector__title {
  font-weight: 700;
}

.date-selector__input {
  width: 100%;
}

.date-selector__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.date-selector__apply {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

button {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--bg-1);
  color: var(--text-0);
  padding: 0.45rem 0.65rem;
  cursor: pointer;
}

button:hover {
  background: var(--bg-2);
}
</style>
