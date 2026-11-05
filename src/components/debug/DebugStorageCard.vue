<template>
  <VarPaper class="mb-4 p-4" :elevation="0" :radius="16">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-base font-medium text-on-surface">本地存储</h3>
      <VarButton text size="small" @click="refresh">刷新</VarButton>
    </div>
    <p v-if="entries.length === 0" class="py-6 text-center text-sm text-on-surface-variant">
      暂无存储记录
    </p>
    <div v-else class="divide-y divide-outline-variant">
      <div
        v-for="entry in entries"
        :key="entry.key"
        class="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-on-surface">{{ entry.key }}</p>
          <p class="mt-0.5 text-xs text-on-surface-variant">{{ entry.description }} · {{ entry.size }}</p>
        </div>
        <VarButton text type="danger" size="small" class="shrink-0" @click="clear(entry.key)">
          清除
        </VarButton>
      </div>
    </div>
  </VarPaper>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Button as VarButton, Paper as VarPaper } from "@varlet/ui";
import { STORE_KEY } from "@/stores/global";
import { ACCOUNTS_STORE_KEY } from "@/stores/accounts";
import { useToast } from "@/composables/useToast";

interface StorageEntry {
  key: string;
  description: string;
  size: string;
}

const KNOWN_KEYS: Record<string, string> = {
  [STORE_KEY]: "登录会话（清除后将退出登录）",
  [ACCOUNTS_STORE_KEY]: "已保存账号",
};

const toast = useToast();
const entries = ref<StorageEntry[]>([]);

function formatSize(chars: number): string {
  const bytes = chars * 2;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function refresh() {
  const list: StorageEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    list.push({
      key,
      description: KNOWN_KEYS[key] ?? "页面自定义数据",
      size: formatSize((localStorage.getItem(key) ?? "").length),
    });
  }
  entries.value = list.sort((a, b) => a.key.localeCompare(b.key));
}

function clear(key: string) {
  localStorage.removeItem(key);
  refresh();
  if (key === STORE_KEY) {
    toast.success("已清除登录状态，即将重新加载");
    setTimeout(() => window.location.reload(), 800);
    return;
  }
  toast.success("已清除：" + key);
}

onMounted(refresh);
</script>
