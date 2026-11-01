<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

withDefaults(defineProps<{ text?: string }>(), { text: "暂无数据" });
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
    <slot name="icon">
      <AppIcon name="inbox" class="h-10 w-10 opacity-60" />
    </slot>
    <p class="text-sm">{{ text }}</p>
    <slot />
  </div>
</template>