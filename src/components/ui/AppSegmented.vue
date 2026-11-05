<script setup lang="ts" generic="T extends string | number">
import { Check } from "@lucide/vue";

withDefaults(
  defineProps<{
    items: readonly { label: string; value: T }[];
    active: T;
    block?: boolean;
  }>(),
  { block: false }
);

const emit = defineEmits<{ change: [value: T] }>();
</script>

<template>
  <div class="app-segmented" :class="{ 'app-segmented--block': block }" role="group">
    <button
      v-for="item in items"
      :key="String(item.value)"
      type="button"
      class="app-segmented__item"
      :class="{ 'app-segmented__item--active': item.value === active }"
      :aria-pressed="item.value === active"
      @click="emit('change', item.value)"
    >
      <Check v-if="item.value === active" :size="16" class="app-segmented__check" />
      <span>{{ item.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.app-segmented {
  display: inline-flex;
  border: 1px solid var(--md-outline);
  border-radius: 999px;
  overflow: hidden;
}

.app-segmented--block {
  display: flex;
  width: 100%;
}

.app-segmented--block .app-segmented__item {
  flex: 1;
}

.app-segmented__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-on-surface);
  background: transparent;
  transition: background-color var(--md-motion-fast) var(--md-ease-standard);
}

.app-segmented__item + .app-segmented__item {
  border-left: 1px solid var(--md-outline);
}

.app-segmented__item:not(.app-segmented__item--active):hover {
  background: var(--md-state-layer-hover);
}

.app-segmented__item:active {
  background: var(--md-state-layer-pressed);
}

.app-segmented__item--active,
.app-segmented__item--active:active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}
</style>
