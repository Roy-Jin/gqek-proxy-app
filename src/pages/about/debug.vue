<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">开发者调试</h2>
      <button
        type="button"
        class="text-sm text-gray-500 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
        @click="back"
      >
        返回
      </button>
    </div>

    <DebugAccountCard />
    <DebugLogCard />
    <DebugHealthCard />
    <DebugApiCard />
    <DebugBridgeCard />
    <DebugProxyCard />
    <DebugStorageCard />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import DebugAccountCard from "@/components/debug/DebugAccountCard.vue";
import DebugBridgeCard from "@/components/debug/DebugBridgeCard.vue";
import DebugHealthCard from "@/components/debug/DebugHealthCard.vue";
import DebugProxyCard from "@/components/debug/DebugProxyCard.vue";
import DebugStorageCard from "@/components/debug/DebugStorageCard.vue";
import DebugApiCard from "@/components/debug/DebugApiCard.vue";
import DebugLogCard from "@/components/debug/DebugLogCard.vue";

const router = useRouter();

function back() {
  router.back();
}
</script>
