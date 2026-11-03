<template>
  <DebugModulePage subtitle="探测下载加速节点并调整代理优先级">
    <DebugProxyCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugProxyCard from "@/components/debug/DebugProxyCard.vue";

definePage({ meta: { title: "下载代理" } });
</script>
