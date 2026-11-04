<template>
  <VarDialog :show="dialogVisible" :title="dialogTitle" width="86vw" :dialog-style="{ maxWidth: '24rem' }"
    close-on-click-overlay @update:show="onUpdateShow">
    <!-- Checking -->
    <div v-if="state === 'checking'" class="flex items-center justify-center gap-2 py-4">
      <VarLoading type="circle" color="var(--md-primary)" size="small" />
      <p class="text-sm text-on-surface-variant">正在检查更新...</p>
    </div>

    <!-- Error -->
    <template v-else-if="state === 'error'">
      <p class="text-sm leading-relaxed text-on-surface-variant break-all">{{ error }}</p>
    </template>

    <!-- Up to date -->
    <template v-else-if="state === 'up-to-date'">
      <p class="text-sm leading-relaxed text-on-surface-variant text-center">
        当前已是最新版本 v{{ currentVersion }}
      </p>
    </template>

    <!-- New version available -->
    <template v-else-if="state === 'available' && release">
      <div class="rounded-md bg-surface-container px-4 py-3 text-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-on-surface-variant">当前版本</span>
          <span class="text-on-surface">v{{ currentVersion }}</span>
        </div>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <span class="text-on-surface-variant">最新版本</span>
          <span class="font-semibold text-primary">v{{ release.version }}</span>
        </div>
        <p v-if="release.apkSize" class="mt-1.5 text-right text-xs text-on-surface-variant">
          安装包约 {{ formatSize(release.apkSize) }}
        </p>
      </div>

      <div v-if="release.notes" class="mt-3">
        <p class="mb-1 text-xs text-on-surface-variant">更新说明</p>
        <div
          class="max-h-40 overflow-auto overscroll-contain rounded-md bg-surface-container p-3 text-xs leading-relaxed text-on-surface-variant whitespace-pre-wrap wrap-break-word">
          {{ release.notes }}</div>
      </div>
    </template>

    <template #actions>
      <div v-if="state === 'error'" class="flex w-full gap-2 px-6 pb-6">
        <VarButton class="flex-1" type="primary" tonal @click="requestClose">关闭</VarButton>
        <VarButton class="flex-1" type="primary" @click="recheck">重试</VarButton>
      </div>
      <div v-else-if="state === 'up-to-date'" class="w-full px-6 pb-6">
        <VarButton type="primary" tonal block @click="requestClose">知道了</VarButton>
      </div>
      <div v-else-if="state === 'available' && release" class="flex w-full gap-2 px-6 pb-6">
        <VarButton class="flex-1" type="primary" tonal :disabled="preparing" @click="dismiss">
          稍后
        </VarButton>
        <VarButton class="flex-1" type="primary" :loading="preparing" @click="downloadAndInstall">
          立即更新
        </VarButton>
      </div>
    </template>
  </VarDialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button as VarButton, Dialog, Loading as VarLoading } from "@varlet/ui";
import { useAppUpdate } from "@/composables/useAppUpdate";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const {
  state,
  currentVersion,
  release,
  error,
  dialogVisible,
  preparing,
  checkForUpdate,
  dismiss,
  downloadAndInstall,
} = useAppUpdate();

const dialogTitle = computed(() => (state.value === "available" ? "发现新版本" : "检查更新"));

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function requestClose() {
  if (state.value === "available") {
    dismiss();
    return;
  }
  dialogVisible.value = false;
}

// Overlay/escape closes must follow the same dismiss rules as the buttons
function onUpdateShow(value: boolean) {
  if (!value) requestClose();
}

function recheck() {
  void checkForUpdate();
}
</script>
