<template>
  <AppCard class="mb-4">
    <p class="text-sm font-medium text-gray-700 mb-3">当前账号</p>
    <div class="space-y-1.5 text-sm text-gray-600">
      <p>姓名：{{ text(auth.user?.nickName) }}</p>
      <p>学号：{{ text(auth.user?.userName) }}</p>
      <p>ID：{{ text(auth.user?.userId) }}</p>
      <p>班级：{{ text(auth.user?.className) }}</p>
      <p>学校：{{ text(auth.user?.schoolName) }}</p>
      <p>登录状态：{{ auth.token ? "已登录" : "未登录" }}</p>
      <p>已保存账号：{{ accounts.accounts.length }} 个</p>
    </div>
    <AppButton variant="secondary" size="sm" class="mt-3" @click="exportKey">
      复制当前密钥
    </AppButton>
  </AppCard>
</template>

<script setup lang="ts">
import { useAccountsStore } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const auth = useGlobal();
const accounts = useAccountsStore();
const toast = useToast();

function text(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "未提供";
}

async function exportKey() {
  const key = auth.token;
  if (!key) {
    toast.error("暂无密钥可导出");
    return;
  }
  try {
    await navigator.clipboard.writeText(key);
    toast.success("密钥已复制到剪贴板");
  } catch {
    fallbackCopy(key);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
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
  if (ok) {
    toast.success("密钥已复制到剪贴板");
  } else {
    toast.error("复制失败，请手动复制");
  }
}
</script>
