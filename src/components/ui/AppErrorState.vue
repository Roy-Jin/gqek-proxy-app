<script setup lang="ts">
import { Icon as VarIcon, Button as VarButton } from "@varlet/ui";

defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-lg bg-error-container px-4 py-8 text-center">
    <VarIcon name="alert-circle-outline" :size="28" class="text-on-error-container" />
    <p class="text-sm text-on-error-container">{{ message }}</p>
    <VarButton size="small" text text-color="var(--md-on-error-container)" @click="emit('retry')">
      <VarIcon name="refresh" :size="16" />
      重试
    </VarButton>
  </div>
</template>
