<script setup lang="ts" generic="T extends string | number">
withDefaults(
  defineProps<{
    items: readonly { label: string; value: T }[];
    active: T;
    /** Stretch each tab to equal width */
    block?: boolean;
  }>(),
  { block: false }
);

const emit = defineEmits<{ change: [value: T] }>();
</script>

<template>
  <div class="flex p-1 rounded-xl bg-gray-100 mb-4" :class="block ? '' : 'w-fit'">
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="px-4 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap"
      :class="[
        block ? 'flex-1' : '',
        active === item.value
          ? 'bg-white text-gray-900 shadow-sm font-medium'
          : 'text-gray-500 hover:text-gray-700',
      ]"
      @click="emit('change', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
