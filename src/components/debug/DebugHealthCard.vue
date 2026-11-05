<template>
  <VarPaper class="mb-4 p-4" :elevation="0" :radius="16" style="--paper-background: var(--md-surface-container)">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-base font-medium text-on-surface">接口连通性</h3>
      <VarButton type="primary" tonal size="small" :loading="running" @click="runAll">
        开始检测
      </VarButton>
    </div>
    <div class="space-y-2 text-sm">
      <div
        v-for="row in rows"
        :key="row.name"
        class="flex items-center gap-2 text-on-surface-variant"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="dotClass(row.status)"
        ></span>
        <span class="flex-1 min-w-0 truncate">{{ row.name }}</span>
        <span class="shrink-0 text-xs" :class="row.status === 'fail' ? 'text-error' : 'text-on-surface-variant'">
          {{ row.detail }}
        </span>
      </div>
    </div>
  </VarPaper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button as VarButton, Paper as VarPaper } from "@varlet/ui";
import { getCaptchaImage, getInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import type { RequestResult } from "@/utils/request";
import { errorMessage } from "@/utils/error";

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
    idle: "bg-outline",
    checking: "bg-warning animate-pulse",
    ok: "bg-success",
    fail: "bg-error",
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
