<template>
  <AppCard class="mb-4">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <p class="text-sm font-medium text-gray-700">日志</p>
        <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input v-model="enabled" type="checkbox" class="h-3.5 w-3.5 accent-primary" />
          记录日志
        </label>
      </div>
      <AppButton variant="ghost" size="sm" @click="clearLogs">清空</AppButton>
    </div>
    <div class="max-h-96 overflow-auto">
      <div v-if="!enabled" class="py-10 text-center text-gray-400 text-sm">
        日志记录未开启
      </div>
      <div v-else-if="logs.length === 0" class="py-10 text-center text-gray-400 text-sm">
        暂无日志
      </div>
      <div
        v-for="entry in logs"
        :key="entry.id"
        class="px-4 py-2 text-xs border-b border-gray-50 last:border-0"
      >
        <div class="flex items-center gap-2">
          <span class="text-gray-400 shrink-0">{{ entry.time }}</span>
          <span class="font-medium shrink-0" :class="levelClass(entry.level)">{{ entry.level.toUpperCase() }}</span>
        </div>
        <p class="mt-1 text-gray-700 break-all">{{ entry.args.join(' ') }}</p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { useDebugLog } from "@/utils/logger";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const { logs, clearLogs, enabled } = useDebugLog();

function levelClass(level: string): string {
  const map: Record<string, string> = {
    error: "text-red-500",
    warn: "text-amber-500",
    info: "text-blue-500",
    debug: "text-gray-400",
    log: "text-gray-500",
  };
  return map[level] ?? "text-gray-500";
}
</script>
