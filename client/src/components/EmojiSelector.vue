<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import emojiData from '@/assets/emoji.json'
import IconXmark from './icons/IconXmark.vue'

const DEFAULT_EMOJI_CATEGORIES = Object.entries(emojiData.group || {}).map(
  ([label, emojis], index) => ({
    key: `group-${index}`,
    label,
    emojis: Array.isArray(emojis) ? emojis : [],
  }),
)

const DEFAULT_EMOJIS = DEFAULT_EMOJI_CATEGORIES.flatMap((category) => category.emojis)
const emojiCategoryMap = DEFAULT_EMOJI_CATEGORIES.reduce((acc, category) => {
  category.emojis.forEach((emoji) => {
    acc[emoji] = category.key
  })
  return acc
}, {})

function getRandomEmoji(emojis) {
  const candidates = Array.isArray(emojis) && emojis.length > 0 ? emojis : DEFAULT_EMOJIS

  if (candidates.length === 0) {
    return '🙂'
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  emojis: {
    type: Array,
  },
  placeholder: {
    type: String,
    default: '選択してください',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const activeCategory = ref('all')
const resolvedEmojis = computed(() => (Array.isArray(props.emojis) ? props.emojis : DEFAULT_EMOJIS))
const selectedEmoji = ref(props.modelValue || getRandomEmoji(resolvedEmojis.value))

const displayEmoji = computed(() => selectedEmoji.value || '🙂')

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      selectedEmoji.value = value
    }
  },
)

const categoryTabs = computed(() => {
  const tabs = [
    {
      key: 'all',
      label: 'すべて',
      count: resolvedEmojis.value.length,
    },
  ]

  DEFAULT_EMOJI_CATEGORIES.forEach((category) => {
    const count = resolvedEmojis.value.filter(
      (emoji) => emojiCategoryMap[emoji] === category.key,
    ).length
    if (count > 0) {
      tabs.push({
        key: category.key,
        label: category.label,
        count,
      })
    }
  })

  const otherCount = resolvedEmojis.value.filter((emoji) => !emojiCategoryMap[emoji]).length
  if (otherCount > 0) {
    tabs.push({ key: 'other', label: 'その他', count: otherCount })
  }

  if (!tabs.some((tab) => tab.key === activeCategory.value)) {
    activeCategory.value = 'all'
  }

  return tabs
})

const categoryEmojis = computed(() => {
  if (activeCategory.value === 'all') {
    return resolvedEmojis.value
  }

  if (activeCategory.value === 'other') {
    return resolvedEmojis.value.filter((emoji) => !emojiCategoryMap[emoji])
  }

  return resolvedEmojis.value.filter((emoji) => emojiCategoryMap[emoji] === activeCategory.value)
})

function setCategory(categoryKey) {
  activeCategory.value = categoryKey
}

function togglePicker() {
  if (props.disabled) {
    return
  }

  if (!isOpen.value) {
    const selectedCategory = emojiCategoryMap[selectedEmoji.value]
    activeCategory.value = selectedCategory || 'all'
  }

  isOpen.value = !isOpen.value
}

function selectEmoji(emoji) {
  selectedEmoji.value = emoji
  emit('update:modelValue', emoji)
  emit('change', emoji)
  isOpen.value = false
}

function closePicker() {
  isOpen.value = false
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    closePicker()
  }
}

watch(isOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  if (!props.modelValue && selectedEmoji.value) {
    emit('update:modelValue', selectedEmoji.value)
    emit('change', selectedEmoji.value)
  }

  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="emoji-selector" :class="{ 'is-disabled': disabled }">
    <button
      type="button"
      class="emoji-selector__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :disabled="disabled"
      @click="togglePicker"
    >
      <span class="emoji-selector__value">{{ displayEmoji }}</span>
      <span v-if="placeholder !== ''" class="emoji-selector__label">{{
        modelValue ? '変更' : placeholder
      }}</span>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="emoji-selector__modal-backdrop" @click="closePicker">
        <div
          class="emoji-selector__modal"
          role="dialog"
          aria-modal="true"
          aria-label="絵文字一覧"
          @click.stop
        >
          <div class="emoji-selector__modal-header">
            <div class="emoji-selector__modal-title-wrap">
              <span class="emoji-selector__modal-title-emoji">{{ displayEmoji }}</span>
              <span class="emoji-selector__modal-title">絵文字を選択</span>
            </div>
            <button
              type="button"
              class="emoji-selector__close"
              aria-label="閉じる"
              @click="closePicker"
            >
              <IconXmark />
            </button>
          </div>

          <div class="emoji-selector__tabs" role="tablist" aria-label="絵文字カテゴリ">
            <button
              v-for="tab in categoryTabs"
              :key="tab.key"
              type="button"
              role="tab"
              class="emoji-selector__tab"
              :class="{ 'is-active': tab.key === activeCategory }"
              :aria-selected="tab.key === activeCategory"
              @click="setCategory(tab.key)"
            >
              {{ tab.label }}
              <span class="emoji-selector__tab-count">{{ tab.count }}</span>
            </button>
          </div>

          <div class="emoji-selector__grid" role="listbox" aria-label="絵文字一覧">
            <button
              v-for="emoji in categoryEmojis"
              :key="emoji"
              type="button"
              role="option"
              :aria-selected="emoji === selectedEmoji"
              class="emoji-selector__option"
              :class="{ 'is-selected': emoji === selectedEmoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables.scss' as var;

.emoji-selector {
  position: relative;

  &.is-disabled {
    opacity: 0.7;
  }
}

.emoji-selector__trigger {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background-color: var(--bg-1);
  color: var(--text-0);
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  height: 100%;

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(0, 0, 255, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
  }

}

.emoji-selector__value {
  font-size: 1.35rem;
  line-height: 1;
}

.emoji-selector__label {
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.emoji-selector__modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 20, 0.55);
  backdrop-filter: blur(3px);
  z-index: 80;
  animation: emoji-fade-in 0.18s ease;
}

.emoji-selector__modal {
  width: 100vw;
  height: 100dvh;
  box-sizing: border-box;
  background-color: var(--bg-0);
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.emoji-selector__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.75rem 0.75rem 0.5rem;
}

.emoji-selector__modal-title-wrap {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.emoji-selector__modal-title-emoji {
  font-size: 1.5rem;
  line-height: 1;
}

.emoji-selector__modal-title {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.emoji-selector__close {
  border: 1px solid var(--border);
  border-radius: 999px;
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  background-color: var(--bg-1);
  color: var(--text-0);
  cursor: pointer;
}

.emoji-selector__tabs {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding: 0.15rem 0.75rem 0.35rem;
  -webkit-overflow-scrolling: touch;
}

.emoji-selector__grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 0.45rem;
  align-content: start;
  padding: 0 0.75rem max(0.25rem, env(safe-area-inset-bottom));
}

.emoji-selector__tab {
  flex: 0 0 auto;
  min-height: 40px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background-color: var(--bg-1);
  color: var(--text-0);
  font-size: 0.78rem;
  line-height: 1;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;

  &.is-active {
    border-color: var(--primary);
    background-color: rgba(0, 0, 255, 0.08);
  }
}

.emoji-selector__tab-count {
  min-width: 1.15rem;
  padding: 0.12rem 0.24rem;
  border-radius: 999px;
  background-color: var(--bg-2);
  font-size: 0.68rem;
}

.emoji-selector__option {
  border: 1px solid transparent;
  border-radius: 8px;
  background-color: var(--bg-1);
  color: inherit;
  width: 100%;
  aspect-ratio: 1 / 1;
  min-height: 0;
  padding: 0;
  font-size: 1.6rem;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    background-color: var(--bg-2);
    border-color: var(--border);
  }

  &.is-selected {
    border-color: var(--primary);
    background-color: rgba(0, 0, 255, 0.08);
  }
}

@keyframes emoji-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

// @media (max-width: 768px) {
//   .emoji-selector__trigger {
//     min-height: 48px;
//     padding: 0.65rem 0.8rem;
//   }

//   .emoji-selector__modal {
//     gap: 0;
//   }

//   .emoji-selector__modal-header {
//     padding: 0.65rem 0.65rem 0.45rem;
//   }

//   .emoji-selector__tabs {
//     padding: 0.1rem 0.65rem 0.3rem;
//   }

//   .emoji-selector__grid {
//     grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
//     gap: 0.4rem;
//     padding: 0 0.65rem max(0.2rem, env(safe-area-inset-bottom));
//   }

//   .emoji-selector__option {
//     font-size: 1.45rem;
//   }
// }
</style>
