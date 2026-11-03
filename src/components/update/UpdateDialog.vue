<template>
  <AppModal
    :open="dialogVisible"
    :title="dialogTitle"
    width-class="max-w-sm"
    @close="requestClose"
  >
    <!-- Checking -->
    <div v-if="state === 'checking'" class="mt-3 flex items-center justify-center gap-2 py-4">
      <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></span>
      <p class="text-sm text-gray-500">正在检查更新...</p>
    </div>

    <!-- Error -->
    <template v-else-if="state === 'error'">
      <p class="mt-2 text-sm leading-relaxed text-gray-500 break-all">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <AppButton variant="secondary" class="flex-1" @click="requestClose">关闭</AppButton>
        <AppButton variant="primary" class="flex-1" @click="recheck">重试</AppButton>
      </div>
    </template>

    <!-- Up to date -->
    <template v-else-if="state === 'up-to-date'">
      <p class="mt-2 text-sm leading-relaxed text-gray-500 text-center">
        当前已是最新版本 v{{ currentVersion }}
      </p>
      <AppButton variant="secondary" block class="mt-4" @click="requestClose">知道了</AppButton>
    </template>

    <!-- New version available -->
    <template v-else-if="state === 'available' && release">
      <div class="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-gray-500">当前版本</span>
          <span class="text-gray-700">v{{ currentVersion }}</span>
        </div>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <span class="text-gray-500">最新版本</span>
          <span class="font-semibold text-primary">v{{ release.version }}</span>
        </div>
        <p v-if="release.apkSize" class="mt-1.5 text-right text-xs text-gray-400">
          安装包约 {{ formatSize(release.apkSize) }}
        </p>
      </div>

      <div v-if="release.notes" class="mt-3">
        <p class="mb-1 text-xs text-gray-400">更新说明</p>
        <div
          class="max-h-40 overflow-auto overscroll-contain rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600 whitespace-pre-wrap break-words"
        >{{ release.notes }}</div>
      </div>

      <div class="mt-4 flex gap-2">
        <AppButton
          variant="secondary"
          class="flex-1"
          :disabled="preparing"
          @click="dismiss"
        >
          稍后
        </AppButton>
        <AppButton variant="primary" class="flex-1" :loading="preparing" @click="downloadAndInstall">
          立即更新
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAppUpdate } from "@/composables/useAppUpdate";
import AppButton from "@/components/ui/AppButton.vue";
import AppModal from "@/components/ui/AppModal.vue";

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

function recheck() {
  void checkForUpdate();
}
</script>
