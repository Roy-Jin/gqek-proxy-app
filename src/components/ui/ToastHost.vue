<script setup lang="ts">
import { useToast } from "@/composables/useToast";

const { toasts, dismiss } = useToast();

const dotClass: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-600",
  error: "bg-red-100 text-red-600",
  info: "bg-gray-100 text-gray-600",
};
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
      style="top: calc(1rem + env(safe-area-inset-top)); right: calc(1rem + env(safe-area-inset-right))"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="alert"
        class="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-sm min-w-[220px] max-w-sm bg-white"
      >
        <span class="h-5 w-5 shrink-0 rounded-full grid place-items-center" :class="dotClass[t.type]">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path v-if="t.type === 'success'" d="M5 13l4 4L19 7" />
            <path v-else-if="t.type === 'error'" d="M6 6l12 12M18 6 6 18" />
            <path v-else d="M12 8v5M12 16.5v.5" />
          </svg>
        </span>
        <span class="text-gray-700">{{ t.message }}</span>
        <button
          type="button"
          class="ml-1 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="关闭"
          @click="dismiss(t.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>