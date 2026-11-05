<template>
  <VarPaper class="mb-4 p-4" :elevation="0" :radius="16"
    style="--paper-background: var(--md-surface-container)">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-medium text-on-surface">下载加速代理</h3>
        <p class="mt-0.5 text-xs text-on-surface-variant">按优先级顺序探测，优先使用靠上的节点</p>
      </div>
      <VarSwitch
        variant
        :model-value="proxyEnabled"
        aria-label="启用下载加速代理"
        @change="toggleProxy"
      />
    </div>

    <p v-if="!proxyEnabled" class="py-4 text-center text-sm text-on-surface-variant">
      代理已关闭，下载将直连 GitHub
    </p>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0 text-xs text-on-surface-variant">
          <p v-if="probed">
            本次使用：<span class="text-on-surface">{{ selectedProxy ?? "无（回退原始链接）" }}</span>
          </p>
          <p v-else>调整顺序后建议重新检测</p>
        </div>
        <div class="flex gap-1.5">
          <VarButton text size="small" :loading="probing" @click="runProbe">重新检测</VarButton>
          <VarButton text size="small" :disabled="!isCustomOrder" @click="resetOrder">
            重置顺序
          </VarButton>
        </div>
      </div>

      <div class="mt-3 divide-y divide-outline-variant overflow-hidden rounded-md bg-surface-high">
        <div
          v-for="(proxy, index) in proxies"
          :key="proxy"
          class="flex items-center gap-2 px-3 py-2"
          :class="selectedProxy === proxy ? 'bg-secondary-container' : ''"
        >
          <span class="shrink-0 text-[11px] text-on-surface-variant">#{{ index + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs text-on-surface">{{ proxy }}</p>
            <p class="text-[11px]" :class="statusClass(resultFor(proxy))">
              {{ detailFor(proxy) }}
            </p>
          </div>
          <span
            v-if="selectedProxy === proxy"
            class="inline-flex shrink-0 items-center rounded-sm bg-primary-container px-2 py-0.5 text-xs font-medium text-on-primary-container"
          >
            将使用
          </span>
          <div class="flex shrink-0 flex-col">
            <VarButton
              icon-container
              text
              round
              size="small"
              aria-label="上移"
              :disabled="index === 0"
              @click="move(index, -1)"
            >
              <VarIcon name="chevron-down" :size="16" class="rotate-180" />
            </VarButton>
            <VarButton
              icon-container
              text
              round
              size="small"
              aria-label="下移"
              :disabled="index === proxies.length - 1"
              @click="move(index, 1)"
            >
              <VarIcon name="chevron-down" :size="16" />
            </VarButton>
          </div>
        </div>
      </div>

      <p v-if="probed && !selectedProxy" class="mt-2 text-xs text-on-surface-variant">
        全部代理不可用，下载时将回退为原始链接
      </p>
    </template>
  </VarPaper>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Button as VarButton, Icon as VarIcon, Paper as VarPaper, Switch as VarSwitch } from "@varlet/ui";
import { useEnvStore } from "@/stores/env";
import { useUpdateStore } from "@/stores/update";
import { useToast } from "@/composables/useToast";
import {
  probeProxy,
  type ProxyProbeResult,
  type ProxyProbeStatus,
} from "@/utils/downloadProxy";

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
let probeRound = 0;

const proxyEnabled = computed(() => settings.proxyEnabled);
const proxies = computed(() => settings.orderedProxies);
const isCustomOrder = computed(() => settings.proxyOrder.length > 0);

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
  if (!result) return "text-on-surface-variant";
  if (result.status === "available") return "text-success";
  if (result.status === "timeout") return "text-warning";
  return "text-on-surface-variant";
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

async function runProbe() {
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
      if (round !== probeRound) return;
      results.value = [...results.value, result];
    }
  } catch {
    // Canceled rounds carry no status
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


