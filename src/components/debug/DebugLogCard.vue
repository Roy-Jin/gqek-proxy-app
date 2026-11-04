<template>
  <section class="mb-4 rounded-lg bg-surface-low p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-3">
        <h3 class="text-base font-medium text-on-surface">日志</h3>
        <VarCheckbox v-model="enabled" class="text-xs text-on-surface-variant">
          记录日志
        </VarCheckbox>
      </div>
      <VarButton text size="small" @click="clearLogs">清空</VarButton>
    </div>
    <div v-if="!enabled" class="py-10 text-center text-sm text-on-surface-variant">
      日志记录未开启
    </div>
    <div v-else-if="logs.length === 0" class="py-10 text-center text-sm text-on-surface-variant">
      暂无日志
    </div>
    <div
      v-else
      class="max-h-96 divide-y divide-outline-variant overflow-auto rounded-md bg-surface-high"
    >
      <div v-for="entry in logs" :key="entry.id" class="px-3 py-2 font-mono text-xs">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-on-surface-variant">{{ entry.time }}</span>
          <span class="shrink-0 font-medium" :class="levelClass(entry.level)">
            {{ entry.level.toUpperCase() }}
          </span>
        </div>
        <p class="mt-1 break-all text-on-surface">{{ entry.args.join(' ') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button as VarButton, Checkbox as VarCheckbox } from "@varlet/ui";
import { useDebugLog } from "@/utils/logger";

const { logs, clearLogs, enabled } = useDebugLog();

function levelClass(level: string): string {
  const map: Record<string, string> = {
    error: "text-error",
    warn: "text-warning",
    info: "text-primary",
    debug: "text-on-surface-variant",
    log: "text-on-surface-variant",
  };
  return map[level] ?? "text-on-surface-variant";
}
</script>
