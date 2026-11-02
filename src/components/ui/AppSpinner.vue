<script setup lang="ts">
import { useEnvStore } from "@/stores/env";

const props = defineProps<{ text?: string }>();
const env = useEnvStore();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
    <span class="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></span>
    <span class="text-sm">{{ props.text ?? env.ui.loadingText }}</span>
  </div>
</template>