<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <p v-if="subtitle" class="mb-4 text-sm text-gray-500">{{ subtitle }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  subtitle?: string;
}>();
</script>
