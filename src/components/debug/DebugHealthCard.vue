<template>
  <AppCard class="mb-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm font-medium text-gray-700">接口连通性</p>
      <AppButton variant="secondary" size="sm" :loading="running" @click="runAll">
        开始检测
      </AppButton>
    </div>
    <div class="space-y-2 text-sm">
      <div
        v-for="row in rows"
        :key="row.name"
        class="flex items-center gap-2 text-gray-600"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="dotClass(row.status)"
        ></span>
        <span class="flex-1 min-w-0 truncate">{{ row.name }}</span>
        <span class="shrink-0 text-xs" :class="row.status === 'fail' ? 'text-red-500' : 'text-gray-400'">
          {{ row.detail }}
        </span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { getCaptchaImage, getInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import type { RequestResult } from "@/utils/request";
import { errorMessage } from "@/utils/error";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

type RowStatus = "idle" | "checking" | "ok" | "fail";

interface HealthRow {
  name: string;
  status: RowStatus;
  detail: string;
  run: () => Promise<RequestResult<unknown>>;
}

const auth = useGlobal();
const running = ref(false);

const rows = ref<HealthRow[]>([
  {
    name: "验证码接口 /captchaImage（无需登录）",
    status: "idle",
    detail: "待检测",
    run: () => getCaptchaImage() as Promise<RequestResult<unknown>>,
  },
  {
    name: "用户信息 /getInfo（需登录）",
    status: "idle",
    detail: "待检测",
    run: () => getInfo() as Promise<RequestResult<unknown>>,
  },
]);

function dotClass(status: RowStatus): string {
  const map: Record<RowStatus, string> = {
    idle: "bg-gray-300",
    checking: "bg-amber-400 animate-pulse",
    ok: "bg-green-500",
    fail: "bg-red-500",
  };
  return map[status];
}

async function runAll() {
  if (running.value) return;
  running.value = true;
  for (const row of rows.value) {
    if (row.name.includes("需登录") && !auth.token) {
      row.status = "idle";
      row.detail = "未登录，跳过";
      continue;
    }
    row.status = "checking";
    row.detail = "检测中...";
    const started = performance.now();
    try {
      const res = await row.run();
      const ms = Math.round(performance.now() - started);
      const code = (res.data as { code?: number } | null)?.code;
      const passed = res.ok && code === 200;
      row.status = passed ? "ok" : "fail";
      row.detail = `HTTP ${res.status} · code ${code ?? "?"} · ${ms}ms`;
    } catch (e) {
      const ms = Math.round(performance.now() - started);
      row.status = "fail";
      row.detail = `${errorMessage(e)} · ${ms}ms`;
    }
  }
  running.value = false;
}
</script>
