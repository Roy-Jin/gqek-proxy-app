<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 5 });
</script>

<template>
  <div v-for="i in rows" :key="i" class="animate-pulse space-y-2 p-4 sm:p-5">
    <div class="h-3.5 w-1/4 rounded bg-gray-200"></div>
    <div class="h-3 w-3/4 rounded bg-gray-100"></div>
    <div class="h-3 w-1/2 rounded bg-gray-100"></div>
  </div>
</template>
