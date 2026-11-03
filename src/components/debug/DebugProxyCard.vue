<template>
  <AppCard class="mb-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-gray-700">下载加速代理</p>
        <p class="mt-0.5 text-xs text-gray-400">按优先级顺序探测，优先使用靠上的节点</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label="启用下载加速代理"
        :aria-checked="proxyEnabled"
        class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        :class="proxyEnabled ? 'bg-primary' : 'bg-gray-200'"
        @click="toggleProxy"
      >
        <span
          class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
          :class="proxyEnabled ? 'left-[22px]' : 'left-0.5'"
        ></span>
      </button>
    </div>

    <p v-if="!proxyEnabled" class="py-4 text-center text-sm text-gray-400">
      代理已关闭，下载将直连 GitHub
    </p>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0 text-xs text-gray-400">
          <p v-if="probed">
            本次使用：<span class="text-gray-600">{{ selectedProxy ?? "无（回退原始链接）" }}</span>
          </p>
          <p v-else class="text-gray-400">调整顺序后建议重新检测</p>
        </div>
        <div class="flex gap-1.5">
          <AppButton variant="ghost" size="sm" :loading="probing" @click="runProbe">重新检测</AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            :disabled="!isCustomOrder"
            @click="resetOrder"
          >
            重置顺序
          </AppButton>
        </div>
      </div>

      <div class="mt-2 space-y-1.5">
        <div
          v-for="(proxy, index) in proxies"
          :key="proxy"
          class="flex items-center gap-2 rounded-lg border px-2.5 py-2"
          :class="selectedProxy === proxy ? 'border-primary/40 bg-primary-soft' : 'border-gray-200'"
        >
          <span class="shrink-0 text-[11px] text-gray-400">#{{ index + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs text-gray-700">{{ proxy }}</p>
            <p class="text-[11px]" :class="statusClass(resultFor(proxy))">
              {{ detailFor(proxy) }}
            </p>
          </div>
          <span
            v-if="selectedProxy === proxy"
            class="shrink-0 text-[11px] font-medium text-primary"
          >
            将使用
          </span>
          <div class="flex shrink-0 flex-col">
            <button
              type="button"
              aria-label="上移"
              class="px-1 leading-tight text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
              :disabled="index === 0"
              @click="move(index, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="下移"
              class="px-1 leading-tight text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
              :disabled="index === proxies.length - 1"
              @click="move(index, 1)"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <p v-if="probed && !selectedProxy" class="mt-2 text-xs text-gray-400">
        全部代理不可用，下载时将回退为原始链接
      </p>
    </template>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useEnvStore } from "@/stores/env";
import { useUpdateStore } from "@/stores/update";
import { useToast } from "@/composables/useToast";
import {
  probeProxy,
  type ProxyProbeResult,
  type ProxyProbeStatus,
} from "@/utils/downloadProxy";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const STATUS_LABELS: Record<ProxyProbeStatus, string> = {
  available: "可用",
  unavailable: "不可用",
  timeout: "超时",
  insecure: "不可用（HTTPS 混合内容）",
};

const env = useEnvStore();
const settings = useUpdateStore();
const toast = useToast();

const results = ref<ProxyProbeResult[]>([]);
const probing = ref(false);
const probed = ref(false);
let controller: AbortController | null = null;
// Incremented per probe round so stale rounds cannot write into the latest results.
let probeRound = 0;

const proxyEnabled = computed(() => settings.proxyEnabled);
const proxies = computed(() => settings.orderedProxies);
const isCustomOrder = computed(() => settings.proxyOrder.length > 0);

// The proxy a real download would use: the first available one in priority order.
const selectedProxy = computed(() => {
  for (const proxy of proxies.value) {
    if (resultFor(proxy)?.status === "available") return proxy;
  }
  return null;
});

function resultFor(proxy: string): ProxyProbeResult | undefined {
  return results.value.find((item) => item.proxy === proxy);
}

function statusClass(result: ProxyProbeResult | undefined): string {
  if (!result) return "text-gray-400";
  if (result.status === "available") return "text-green-600";
  if (result.status === "timeout") return "text-amber-500";
  return "text-gray-400";
}

function detailFor(proxy: string): string {
  const result = resultFor(proxy);
  if (!result) return probed.value ? "未检测" : "待检测";
  const parts = [STATUS_LABELS[result.status], `${result.durationMs} ms`];
  if (result.httpStatus !== undefined) parts.push(`HTTP ${result.httpStatus}`);
  if (result.reason) parts.push(result.reason);
  return parts.join(" · ");
}

function toggleProxy() {
  settings.setProxyEnabled(!settings.proxyEnabled);
}

function move(index: number, delta: number) {
  const target = index + delta;
  const next = [...proxies.value];
  const from = next[index];
  const to = next[target];
  if (from === undefined || to === undefined) return;
  next[index] = to;
  next[target] = from;
  settings.setProxyOrder(next);
}

function resetOrder() {
  settings.resetProxyOrder();
  toast.success("已恢复默认优先级");
  void runProbe();
}

// Sequential probing mirrors the real download path: same order, same priority.
async function runProbe() {
  // Supersede any in-flight round before starting a fresh one.
  controller?.abort();
  const round = ++probeRound;
  const current = new AbortController();
  controller = current;
  probing.value = true;
  probed.value = false;
  results.value = [];

  try {
    for (const proxy of proxies.value) {
      const result = await probeProxy(proxy, env.links.apkDownloadUrl, {
        signal: current.signal,
      });
      // Append as soon as each probe settles; ignore rounds that were superseded.
      if (round !== probeRound) return;
      results.value = [...results.value, result];
    }
  } catch {
    // Canceled rounds carry no status; nothing to render.
  } finally {
    if (round === probeRound) {
      controller = null;
      probing.value = false;
      probed.value = true;
    }
  }
}

onMounted(() => {
  if (proxyEnabled.value) void runProbe();
});
onUnmounted(() => {
  probeRound++;
  controller?.abort();
});
</script>
