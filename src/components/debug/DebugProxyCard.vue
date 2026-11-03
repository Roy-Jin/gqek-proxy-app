<template>
  <AppCard class="mb-4">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-gray-700">下载加速代理</p>
        <p class="mt-0.5 text-xs text-gray-400">并发探测，优先使用记忆节点</p>
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
          <p>
            当前记忆：<span class="text-gray-600">{{ rememberedProxy || "无" }}</span>
          </p>
          <p v-if="probed">
            本次最快：<span class="text-gray-600">{{ fastestProxy ?? "无" }}</span>
          </p>
          <p v-if="memoryNote" class="mt-0.5 text-amber-500">{{ memoryNote }}</p>
        </div>
        <div class="flex gap-1.5">
          <AppButton variant="ghost" size="sm" :loading="probing" @click="runProbe">重新检测</AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            :disabled="!rememberedProxy"
            @click="clearMemory"
          >
            清除记忆
          </AppButton>
        </div>
      </div>

      <div class="mt-2 space-y-1.5">
        <div
          v-for="(proxy, index) in env.update.downloadProxies"
          :key="proxy"
          class="flex items-center gap-2 rounded-lg border px-2.5 py-2"
          :class="fastestProxy === proxy ? 'border-primary/40 bg-primary-soft' : 'border-gray-200'"
        >
          <span class="shrink-0 text-[11px] text-gray-400">#{{ index + 1 }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs text-gray-700">{{ proxy }}</p>
            <p class="text-[11px]" :class="statusClass(resultFor(proxy))">
              {{ detailFor(proxy) }}
            </p>
          </div>
          <span
            v-if="fastestProxy === proxy"
            class="shrink-0 text-[11px] font-medium text-primary"
          >
            最快
          </span>
        </div>
      </div>

      <p v-if="probed && !fastestProxy" class="mt-2 text-xs text-gray-400">
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
const memoryNote = ref("");
let controller: AbortController | null = null;
// Incremented per probe round so stale rounds cannot write into the latest results.
let probeRound = 0;
// Latched once the round's first available probe is written to memory.
let roundHasAvailable = false;

const proxyEnabled = computed(() => settings.proxyEnabled);
const rememberedProxy = computed(() => settings.preferredProxy);

const fastestProxy = computed(() => {
  let fastest: ProxyProbeResult | null = null;
  for (const result of results.value) {
    if (result.status !== "available") continue;
    if (!fastest || result.durationMs < fastest.durationMs) fastest = result;
  }
  return fastest?.proxy ?? null;
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

function clearMemory() {
  settings.setPreferredProxy("");
  toast.success("已清除代理记忆");
}

async function runProbe() {
  // Supersede any in-flight round before starting a fresh one.
  controller?.abort();
  const round = ++probeRound;
  const current = new AbortController();
  controller = current;
  probing.value = true;
  probed.value = false;
  memoryNote.value = "";
  roundHasAvailable = false;
  results.value = [];

  const tasks = env.update.downloadProxies.map((proxy) =>
    probeProxy(proxy, env.links.apkDownloadUrl, { signal: current.signal })
      .then((result) => {
        // Append as soon as each probe settles; ignore rounds that were superseded.
        if (round !== probeRound) return;
        results.value = [...results.value, result];
        // All probes start together, so the first "available" to settle is the round's
        // fastest; later results never overwrite the memory.
        if (result.status === "available" && !roundHasAvailable) {
          roundHasAvailable = true;
          settings.setPreferredProxy(result.proxy);
        }
      })
      .catch(() => {
        // Canceled probes carry no status; nothing to render.
      })
  );

  try {
    await Promise.all(tasks);
  } finally {
    if (round === probeRound) {
      controller = null;
      probing.value = false;
      probed.value = true;
      if (!roundHasAvailable) memoryNote.value = "本轮无可用代理，记忆未更新";
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
