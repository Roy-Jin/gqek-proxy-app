<template>
  <div class="p-4 max-w-3xl mx-auto">
    <!-- General -->
    <p class="mb-2 px-1 text-sm font-medium text-on-surface-variant">通用</p>
    <VarPaper class="overflow-hidden" :elevation="0" :radius="16"
      style="--paper-background: var(--md-surface-container)" :style="cellVars">
      <VarCell title="应用启动入口" icon="home-outline" icon-class="text-on-surface-variant" border :border-offset="16">
        <template #extra>
          <div class="w-28 shrink-0">
            <VarSelect v-model="defaultEntry" :options="entryOptions" size="small" variant="outlined"
              style="font-size: 14px" aria-label="默认启动入口" />
          </div>
        </template>
      </VarCell>
      <VarCell title="外观主题" icon="palette-outline" icon-class="text-on-surface-variant">
        <template #extra>
          <div class="w-28 shrink-0">
            <VarSelect v-model="themeValue" :options="themeModes" size="small" variant="outlined"
              style="font-size: 14px" aria-label="外观主题" />
          </div>
        </template>
      </VarCell>
    </VarPaper>

    <!-- Updates -->
    <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">更新</p>
    <VarPaper class="overflow-hidden" :elevation="0" :radius="16"
      style="--paper-background: var(--md-surface-container)" :style="cellVars">
      <VarCell title="启动自动检查更新" description="关闭后将不会弹出更新提示" icon="refresh" icon-class="text-on-surface-variant"
        border :border-offset="16">
        <template #extra>
          <VarSwitch variant :model-value="autoCheckEnabled" aria-label="启动自动检查更新" @change="toggleAutoCheck" />
        </template>
      </VarCell>
      <VarCell title="开启下载代理" description="下载更新包时通过代理加速" icon="download-outline"
        icon-class="text-on-surface-variant">
        <template #extra>
          <VarSwitch variant :model-value="proxyEnabled" aria-label="开启下载代理" @change="toggleProxy" />
        </template>
      </VarCell>
    </VarPaper>

    <!-- Debug -->
    <template v-if="debugUnlocked">
      <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">其他</p>
      <VarPaper class="overflow-hidden" :elevation="0" :radius="16"
        style="--paper-background: var(--md-surface-container)" :style="cellVars">
        <VarCell title="开发者调试" icon="code-json" icon-class="text-on-surface-variant" ripple @click="goDebug">
          <template #extra>
            <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
          </template>
        </VarCell>
      </VarPaper>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { definePage } from "vue-router/experimental";
import {
  Cell as VarCell,
  Icon as VarIcon,
  Paper as VarPaper,
  Select as VarSelect,
  Switch as VarSwitch,
} from "@varlet/ui";
import { useDebugUnlock } from "@/composables/useDebugUnlock";
import { useSettingsStore, type DefaultEntry } from "@/stores/settings";
import { useUpdateStore } from "@/stores/update";
import { useThemePreference } from "@/theme";
import type { ThemePreference } from "@/theme/tokens";

definePage({ meta: { title: "设置" } });

const router = useRouter();
const settings = useSettingsStore();
const updateSettings = useUpdateStore();
const theme = useThemePreference();

const entryOptions: { label: string; value: DefaultEntry }[] = [
  { label: "活动", value: "activity" },
  { label: "待办", value: "todo" },
  { label: "关于", value: "about" },
];

// Bind the persisted default entry to the select both ways
const defaultEntry = computed<DefaultEntry>({
  get: () => settings.defaultEntry,
  set: (value) => (settings.defaultEntry = value),
});

const autoCheckEnabled = computed(() => updateSettings.autoCheckEnabled);
const proxyEnabled = computed(() => updateSettings.proxyEnabled);

const themeModes: { label: string; value: ThemePreference }[] = [
  { label: "自动", value: "system" },
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
];

const themeValue = computed<ThemePreference>({
  get: () => theme.preference.value,
  set: (value) => theme.set(value),
});

const cellVars = {
  "--cell-color": "var(--md-on-surface)",
  "--cell-description-color": "var(--md-on-surface-variant)",
  "--cell-font-size": "14px",
  "--cell-padding": "14px 16px",
  "--cell-border-color": "var(--md-outline-variant)",
  "--cell-icon-right": "12px",
};

const { unlocked: debugUnlocked } = useDebugUnlock();

function toggleAutoCheck() {
  updateSettings.setAutoCheckEnabled(!updateSettings.autoCheckEnabled);
}

function toggleProxy() {
  updateSettings.setProxyEnabled(!updateSettings.proxyEnabled);
}

function goDebug() {
  router.push("/about/debug");
}
</script>
