<script setup lang="ts">
import { computed } from "vue";
import { Result as VarResult } from "@varlet/ui";
import { useEnvStore } from "@/stores/env";

const props = defineProps<{ text?: string }>();
const env = useEnvStore();

const message = computed(() => props.text ?? env.ui.emptyText);
</script>

<template>
  <VarResult type="empty" :description="message">
    <template v-if="$slots.default" #footer>
      <slot />
    </template>
  </VarResult>
</template>
