<template>
  <AppCard class="mb-4">
    <p class="text-sm font-medium text-gray-700 mb-3">NativeBridge 调试</p>
    <div class="space-y-1.5 text-sm text-gray-600">
      <p>
        桥接环境：
        <span :class="bridgeReady ? 'text-green-600' : 'text-gray-400'">
          {{ bridgeReady ? `已连接（${bridgeMethods.length} 个方法）` : "未检测到（浏览器环境）" }}
        </span>
      </p>
      <p>应用版本：{{ appVersion || "无法获取应用版本" }}</p>
    </div>
    <div class="flex gap-2 mt-3">
      <AppButton variant="secondary" size="sm" @click="refreshBridge">刷新桥接信息</AppButton>
    </div>
    <!-- Capability checklist: a present-but-throwing method means its switch is off -->
    <div v-if="bridgeReady" class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="cap in capabilities"
        :key="cap.name"
        class="px-1.5 py-0.5 rounded text-[11px]"
        :class="cap.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'"
      >
        {{ cap.ok ? "✓" : "✗" }} {{ cap.name }}
      </span>
    </div>
    <pre
      v-if="bridgeReady && bridgeMethods.length"
      class="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-auto"
    >{{ bridgeMethods.join("\n") }}</pre>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getNativeVersion, listBridgeMethods, waitForBridge } from "@/utils/nativeBridge";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const bridgeReady = ref(false);
const bridgeMethods = ref<string[]>([]);
const appVersion = ref("");

/** Methods the update flow depends on; missing ones usually mean disabled capabilities. */
const REQUIRED_METHODS = ["getAppInfo", "showToast", "openUrl"];

const capabilities = computed(() =>
  REQUIRED_METHODS.map((name) => ({ name, ok: bridgeMethods.value.includes(name) }))
);

async function refreshBridge() {
  bridgeReady.value = await waitForBridge();
  bridgeMethods.value = listBridgeMethods();
  appVersion.value = (await getNativeVersion()) ?? "";
}

onMounted(refreshBridge);
</script>
