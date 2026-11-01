<template>
  <div class="min-h-full flex flex-col items-center justify-center p-6 text-center">
    <p class="text-6xl font-bold text-primary-soft">404</p>
    <h2 class="mt-4 text-lg font-semibold text-gray-900">页面不存在</h2>
    <p class="mt-1 text-sm text-gray-500">您访问的页面可能已被移除或链接有误</p>
    <AppButton variant="primary" class="mt-6" @click="goHome">返回首页</AppButton>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";

const router = useRouter();
function goHome() {
  router.replace("/activity");
}
</script>