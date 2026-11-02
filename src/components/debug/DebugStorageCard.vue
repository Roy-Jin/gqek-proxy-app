<template>
  <AppCard class="mb-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm font-medium text-gray-700">本地存储</p>
      <AppButton variant="ghost" size="sm" @click="refresh">刷新</AppButton>
    </div>
    <div v-if="entries.length === 0" class="py-6 text-center text-sm text-gray-400">
      暂无存储记录
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.key"
        class="flex items-center gap-2 text-sm"
      >
        <div class="min-w-0 flex-1">
          <p class="text-gray-700 truncate">{{ entry.key }}</p>
          <p class="text-xs text-gray-400">{{ entry.description }} · {{ entry.size }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
          @click="clear(entry.key)"
        >
          清除
        </button>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { STORE_KEY } from "@/stores/global";
import { ACCOUNTS_STORE_KEY } from "@/stores/accounts";
import { useToast } from "@/composables/useToast";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

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
  // UTF-16: 2 bytes per char, good enough for a size hint
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
