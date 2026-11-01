<script setup lang="ts">
import { computed } from "vue";
import AppButton from "./AppButton.vue";

const props = withDefaults(
  defineProps<{
    page: number;
    total: number;
    pageSize: number;
    loading?: boolean;
  }>(),
  { loading: false }
);

const emit = defineEmits<{ change: [page: number] }>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1));
const to = computed(() => Math.min(props.page * props.pageSize, props.total));
</script>

<template>
  <div class="flex items-center justify-between flex-wrap gap-3 mt-5">
    <p class="text-sm text-gray-500">
      共 <span class="font-medium text-gray-700">{{ total }}</span> 条
      <span v-if="total > 0" class="text-gray-400">（{{ from }}-{{ to }}）</span>
    </p>
    <div class="flex items-center gap-2">
      <AppButton size="sm" variant="secondary" :disabled="page <= 1 || loading" @click="emit('change', page - 1)">
        上一页
      </AppButton>
      <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
      <AppButton size="sm" variant="secondary" :disabled="page >= totalPages || loading" @click="emit('change', page + 1)">
        下一页
      </AppButton>
    </div>
  </div>
</template>