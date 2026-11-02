<script setup lang="ts">
withDefaults(defineProps<{ padding?: boolean }>(), { padding: true });
</script>

<template>
  <div
    class="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(15,23,42,0.07)]"
    :class="padding ? 'p-5' : ''"
  >
    <slot />
  </div>
</template>