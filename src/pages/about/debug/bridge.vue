<template>
  <DebugModulePage subtitle="检查 NativeBridge 能力与应用版本">
    <DebugBridgeCard />
  </DebugModulePage>
</template>

<script setup lang="ts">
import { definePage } from "vue-router/experimental";
import DebugModulePage from "@/components/debug/DebugModulePage.vue";
import DebugBridgeCard from "@/components/debug/DebugBridgeCard.vue";

definePage({ meta: { title: "原生桥接" } });
</script>
