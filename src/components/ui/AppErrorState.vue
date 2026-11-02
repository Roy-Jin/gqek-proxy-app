<script setup lang="ts">
import AppCard from "./AppCard.vue";
import AppButton from "./AppButton.vue";
import AppIcon from "./AppIcon.vue";

defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <AppCard class="text-center">
    <div class="flex flex-col items-center gap-3 text-gray-500">
      <p class="text-sm">{{ message }}</p>
      <AppButton variant="secondary" size="sm" @click="emit('retry')">
        <AppIcon name="refresh" class="h-4 w-4" />
        重试
      </AppButton>
    </div>
  </AppCard>
</template>
