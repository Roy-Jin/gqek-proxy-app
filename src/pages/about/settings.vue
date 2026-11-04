<template>
  <div class="p-4 max-w-3xl mx-auto">
    <p class="mb-2 px-1 text-sm font-medium text-on-surface-variant">应用</p>
    <div class="overflow-hidden rounded-lg bg-surface-container" :style="cellVars">
      <VarCell title="启动自动检查更新" description="关闭后启动时仍会检查，但不会弹出更新提示"
        icon="refresh" icon-class="text-on-surface-variant" border :border-offset="16">
        <template #extra>
          <VarSwitch variant :model-value="autoCheckEnabled" aria-label="启动自动检查更新" @change="toggleAutoCheck" />
        </template>
      </VarCell>

      <VarCell title="外观主题" icon="palette-outline" icon-class="text-on-surface-variant">
        <template #extra>
          <!-- Fixed-width wrapper: VarSelect itself stretches to 100% of its parent -->
          <div class="w-32 shrink-0">
            <VarSelect
              v-model="themeValue"
              :options="themeModes"
              size="small"
              variant="outlined"
              style="font-size: 14px"
              aria-label="外观主题"
            />
          </div>
        </template>
      </VarCell>
    </div>

    <template v-if="debugUnlocked">
      <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">其他</p>
      <div class="overflow-hidden rounded-lg bg-surface-container" :style="cellVars">
        <VarCell title="开发者调试" icon="code-json" icon-class="text-on-surface-variant" ripple @click="goDebug">
          <template #extra>
            <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
          </template>
        </VarCell>
      </div>
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
  Select as VarSelect,
  Switch as VarSwitch,
} from "@varlet/ui";
import { useDebugUnlock } from "@/composables/useDebugUnlock";
import { useUpdateStore } from "@/stores/update";
import { useThemePreference } from "@/theme";
import type { ThemePreference } from "@/theme/tokens";

definePage({ meta: { title: "设置" } });

const router = useRouter();
const updateSettings = useUpdateStore();
const theme = useThemePreference();

const autoCheckEnabled = computed(() => updateSettings.autoCheckEnabled);

const themeModes: { label: string; value: ThemePreference }[] = [
  { label: "自动", value: "system" },
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
];

/** Bind the persisted theme preference to the select both ways. */
const themeValue = computed<ThemePreference>({
  get: () => theme.preference.value,
  set: (value) => theme.set(value),
});

// Keep Varlet Cell typography/colors aligned with the app's Material tokens
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

function goDebug() {
  router.push("/about/debug");
}
</script>
