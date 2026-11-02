<script setup lang="ts">
withDefaults(defineProps<{ checked?: boolean }>(), { checked: false });
</script>

<template>
  <span
    class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150"
    :class="checked ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-transparent'"
  >
    <svg
      class="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  </span>
</template>
