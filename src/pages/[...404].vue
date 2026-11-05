<template>
  <div class="p-4 max-w-3xl mx-auto flex flex-col items-center justify-center py-24 gap-3">
    <AlertCircle :size="48" class="text-on-surface-variant" />
    <p class="text-sm text-on-surface-variant">页面不存在，正在返回首页...</p>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle } from "@lucide/vue";
import { useRouter } from "vue-router";
import { DEFAULT_ENTRY_PATH, useSettingsStore } from "@/stores/settings";
const router = useRouter();
const settings = useSettingsStore();
router.replace(DEFAULT_ENTRY_PATH[settings.defaultEntry]);
</script>
