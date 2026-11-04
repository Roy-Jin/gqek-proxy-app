<template>
  <section class="mb-4 rounded-lg bg-surface-low p-4">
    <h3 class="mb-3 text-base font-medium text-on-surface">NativeBridge 调试</h3>
    <div class="space-y-1.5 text-sm text-on-surface-variant">
      <p>
        桥接环境：
        <span :class="bridgeReady ? 'text-success' : 'text-on-surface-variant'">
          {{ bridgeReady ? `已连接（${bridgeMethods.length} 个方法）` : "未检测到（浏览器环境）" }}
        </span>
      </p>
      <p>应用版本：{{ appVersion || "无法获取应用版本" }}</p>
    </div>
    <div class="mt-3 flex gap-2">
      <VarButton type="primary" tonal size="small" @click="refreshBridge">刷新桥接信息</VarButton>
    </div>
    <div v-if="bridgeReady" class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="cap in capabilities"
        :key="cap.name"
        class="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium"
        :class="cap.ok ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'"
      >
        {{ cap.ok ? "✓" : "✗" }} {{ cap.name }}
      </span>
    </div>
    <pre
      v-if="bridgeReady && bridgeMethods.length"
      class="mt-3 max-h-64 overflow-auto rounded-md bg-surface-high p-3 font-mono text-xs text-on-surface-variant"
    >{{ bridgeMethods.join("\n") }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button as VarButton } from "@varlet/ui";
import { getNativeVersion, listBridgeMethods, waitForBridge } from "@/utils/nativeBridge";

const bridgeReady = ref(false);
const bridgeMethods = ref<string[]>([]);
const appVersion = ref("");

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
