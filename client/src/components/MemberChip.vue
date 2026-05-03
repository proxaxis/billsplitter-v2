<script setup>
const props = defineProps({
  banner: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <li class="member-chip">
    <span>{{ props.banner }}</span>
  </li>
</template>

<style lang="scss" scoped>
.member-chip {
  padding: 0.35rem 0.6rem;
  background-color: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
}
</style>
