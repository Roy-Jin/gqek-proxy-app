<template>
  <DebugModulePage subtitle="查看当前账号信息，复制密钥或生成临时密钥">
    <DebugAccountCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugAccountCard from "@/components/debug/DebugAccountCard.vue";

definePage({ meta: { title: "账号与密钥" } });
</script>
