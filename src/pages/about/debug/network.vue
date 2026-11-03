<template>
  <DebugModulePage subtitle="检测接口连通性，发起自定义 API 请求">
    <DebugHealthCard />
    <DebugApiCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugHealthCard from "@/components/debug/DebugHealthCard.vue";

import DebugApiCard from "@/components/debug/DebugApiCard.vue";

definePage({ meta: { title: "网络与接口" } });
</script>
