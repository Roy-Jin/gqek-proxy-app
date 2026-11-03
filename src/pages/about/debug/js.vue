<template>
  <DebugModulePage subtitle="在线执行 JS 代码，支持 await 与 console 输出">
    <DebugJsCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugJsCard from "@/components/debug/DebugJsCard.vue";

definePage({ meta: { title: "JS 调试" } });
</script>
