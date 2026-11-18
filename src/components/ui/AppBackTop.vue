<script setup lang="ts">
import { BackTop as VarBackTop } from "@varlet/ui";
import { usePageActive } from "@/composables/usePageActive";

withDefaults(
  defineProps<{
    visibilityHeight?: number;
    right?: number;
    bottom?: number;
  }>(),
  { visibilityHeight: 320, right: 16, bottom: 84 }
);

// Varlet teleports BackTop to <body>; drop it while the cached page is hidden
const active = usePageActive();
</script>

<template>
  <VarBackTop
    v-if="active"
    target="main"
    :visibility-height="visibilityHeight"
    :right="right"
    :bottom="bottom"
  />
</template>
