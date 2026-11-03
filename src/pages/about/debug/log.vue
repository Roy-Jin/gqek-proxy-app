<template>
  <DebugModulePage subtitle="查看控制台日志记录并管理开关">
    <DebugLogCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugLogCard from "@/components/debug/DebugLogCard.vue";

definePage({ meta: { title: "运行日志" } });
</script>
