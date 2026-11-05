<script setup lang="ts">
import { AlertCircle, RefreshCw } from "@lucide/vue";
import { Button as VarButton } from "@varlet/ui";

defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-lg bg-error-container px-4 py-8 text-center">
    <AlertCircle :size="28" class="text-on-error-container" />
    <p class="text-sm text-on-error-container">{{ message }}</p>
    <VarButton size="small" text text-color="var(--md-on-error-container)" @click="emit('retry')">
      <RefreshCw :size="16" />
      重试
    </VarButton>
  </div>
</template>
