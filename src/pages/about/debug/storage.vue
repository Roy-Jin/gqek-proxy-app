<template>
  <DebugModulePage subtitle="查看和清理本地存储数据">
    <DebugStorageCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugStorageCard from "@/components/debug/DebugStorageCard.vue";

definePage({ meta: { title: "本地存储" } });
</script>
