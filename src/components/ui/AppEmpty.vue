<script setup lang="ts">
import { Icon as VarIcon } from "@varlet/ui";
import { useEnvStore } from "@/stores/env";

const props = withDefaults(defineProps<{ text?: string; icon?: string }>(), {
  icon: "file-document-outline",
});
const env = useEnvStore();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-16">
    <div class="grid h-16 w-16 place-items-center rounded-full bg-secondary-container text-on-secondary-container">
      <slot name="icon">
        <VarIcon :name="props.icon" :size="28" />
      </slot>
    </div>
    <p class="text-sm text-on-surface-variant">{{ props.text ?? env.ui.emptyText }}</p>
    <slot />
  </div>
</template>
