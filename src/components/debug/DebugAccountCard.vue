<template>
  <VarPaper class="mb-4 p-4" :elevation="0" :radius="16" style="--paper-background: var(--md-surface-container)">
    <h3 class="mb-3 text-base font-medium text-on-surface">当前账号</h3>
    <div class="space-y-1.5 text-sm text-on-surface-variant">
      <p>姓名：{{ text(auth.user?.nickName) }}</p>
      <p>学号：{{ text(auth.user?.userName) }}</p>
      <p>ID：{{ text(auth.user?.userId) }}</p>
      <p>班级：{{ text(auth.user?.className) }}</p>
      <p>学校：{{ text(auth.user?.schoolName) }}</p>
      <p>登录状态：{{ auth.token ? "已登录" : "未登录" }}</p>
      <p>已保存账号：{{ accounts.accounts.length }} 个</p>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <VarButton type="primary" tonal size="small" @click="exportKey">
        复制当前密钥
      </VarButton>
      <VarButton type="primary" tonal size="small" @click="shareTempKey">
        生成临时密钥（10 分钟）
      </VarButton>
    </div>
    <p
      v-if="tempKey"
      class="mt-3 select-all break-all rounded-md bg-surface-high p-3 font-mono text-xs text-on-surface-variant"
    >{{ tempKey }}</p>
    <p v-if="tempKey" class="mt-1 text-xs text-on-surface-variant">
      有效期至 {{ tempKeyExpiry }}，仅在当前页面内存中保留
    </p>
  </VarPaper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button as VarButton, Paper as VarPaper } from "@varlet/ui";
import { useAccountsStore } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { createTempKey } from "@/utils/tempKey";

const auth = useGlobal();
const accounts = useAccountsStore();
const toast = useToast();

const tempKey = ref("");
const tempKeyExpiry = ref("");

function text(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "未提供";
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return fallbackCopy(value);
  }
}

async function exportKey() {
  const key = auth.token;
  if (!key) {
    toast.error("暂无密钥可导出");
    return;
  }
  if (await copyText(key)) {
    toast.success("密钥已复制到剪贴板");
  } else {
    toast.error("复制失败，请手动复制");
  }
}

async function shareTempKey() {
  if (!auth.token) {
    toast.error("暂无密钥可分享");
    return;
  }
  const { key, expiresAt } = createTempKey(auth.token);
  tempKey.value = key;
  tempKeyExpiry.value = formatExpiry(expiresAt);
  if (await copyText(key)) {
    toast.success(`临时密钥已复制，有效期至 ${tempKeyExpiry.value}`);
  } else {
    toast.error("复制失败，请手动复制下方密钥");
  }
}

function fallbackCopy(value: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = value;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}
</script>
