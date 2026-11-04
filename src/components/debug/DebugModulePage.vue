<template>
  <div class="p-4 max-w-3xl mx-auto">
    <p v-if="subtitle" class="mb-4 text-sm text-on-surface-variant">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  subtitle?: string;
}>();
</script>
