<script setup lang="ts">
withDefaults(defineProps<{ padding?: boolean }>(), { padding: true });
</script>

<template>
  <div
    class="bg-white rounded-xl border border-gray-200/70 shadow-sm"
    :class="padding ? 'p-5' : ''"
  >
    <slot />
  </div>
</template>