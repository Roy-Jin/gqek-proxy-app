<template>
  <div class="p-4 max-w-3xl mx-auto">
    <!-- App identity -->
    <div class="flex flex-col items-center pt-6 pb-2 text-center">
      <div class="grid h-20 w-20 place-items-center rounded-2xl bg-primary text-3xl font-bold text-on-primary">
        {{ env.app.logoText }}
      </div>
      <h2 class="mt-4 text-lg font-semibold text-on-surface">{{ env.app.name }}</h2>
      <div class="mt-2 flex items-center gap-2">
        <VarChip v-if="versionLabel" type="success" size="small">v{{ versionLabel }}</VarChip>
        <VarChip v-else size="small">开发环境</VarChip>
        <VarChip v-if="hasUpdate" type="danger" size="small" class="cursor-pointer" @click="openUpdate">
          有新版本
        </VarChip>
      </div>
      <p class="mt-3 max-w-xs text-sm leading-relaxed text-on-surface-variant">
        {{ env.about.description }}
      </p>
      <VarButton class="mt-4" type="primary" tonal @click="openUpdate">
        <span class="inline-flex items-center gap-2">
          <VarIcon name="refresh" :size="18" />
          检查更新
        </span>
      </VarButton>
    </div>

    <!-- External links -->
    <p class="mb-2 mt-8 px-1 text-sm font-medium text-on-surface-variant">更多</p>
    <div class="overflow-hidden rounded-lg bg-surface-container" :style="cellVars">
      <VarCell v-for="(link, index) in links" :key="link.label" :title="link.label" :description="link.description"
        ripple :border="index < links.length - 1" :border-offset="16" @click="openExternal(link.url)">
        <template #icon>
          <span class="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-on-surface-variant">
            <VarIcon :name="link.icon" :size="20" />
          </span>
        </template>
        <template #extra>
          <VarIcon name="share-outline" :size="18" class="text-on-surface-variant" />
        </template>
      </VarCell>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { definePage } from "vue-router/experimental";
import {
  Button as VarButton,
  Cell as VarCell,
  Chip as VarChip,
  Icon as VarIcon,
} from "@varlet/ui";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useToast } from "@/composables/useToast";
import { useEnvStore } from "@/stores/env";
import { getNativeVersion, isNativeApp, nativeOpen } from "@/utils/nativeBridge";

definePage({ meta: { title: "关于项目" } });

const env = useEnvStore();
const toast = useToast();
const { currentVersion, hasUpdate, openUpdate } = useAppUpdate();

const fallbackVersion = ref("");
const versionLabel = computed(() => currentVersion.value || fallbackVersion.value);

// Keep Varlet Cell typography/colors aligned with the app's Material tokens
const cellVars = {
  "--cell-color": "var(--md-on-surface)",
  "--cell-description-color": "var(--md-on-surface-variant)",
  "--cell-font-size": "14px",
  "--cell-padding": "14px 16px",
  "--cell-border-color": "var(--md-outline-variant)",
  "--cell-icon-right": "12px",
};

const links = computed(() => [
  {
    label: "项目",
    description: "查看源码、提交记录与版本发布",
    icon: "github",
    url: env.links.repoUrl,
  },
  {
    label: "更新日志",
    description: "查看历史版本与更新说明",
    icon: "history",
    url: `${env.links.repoUrl}/releases`,
  },
  {
    label: "问题反馈",
    description: "在 GitHub 提交 Issues",
    icon: "message-text-outline",
    url: `${env.links.repoUrl}/issues`,
  },
]);

async function openExternal(url: string) {
  if (isNativeApp()) {
    if (!(await nativeOpen(url))) toast.error("无法打开链接");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

onMounted(async () => {
  // The version badge works even before any update check ran
  if (currentVersion.value) return;
  const version = await getNativeVersion();
  fallbackVersion.value = version ?? "";
});
</script>
