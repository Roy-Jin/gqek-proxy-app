<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
import { useEnvStore } from "@/stores/env";

const props = defineProps<{ text?: string }>();
const env = useEnvStore();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
    <slot name="icon">
      <AppIcon name="inbox" class="h-10 w-10 opacity-60" />
    </slot>
    <p class="text-sm">{{ props.text ?? env.ui.emptyText }}</p>
    <slot />
  </div>
</template>