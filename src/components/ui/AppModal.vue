<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; title?: string; widthClass?: string }>(), {
  title: "",
  widthClass: "max-w-xs",
});
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50"
        @click.self="emit('close')"
      >
        <div class="w-full bg-white rounded-2xl p-5" :class="widthClass">
          <p v-if="title" class="text-base font-semibold text-gray-900 text-center">{{ title }}</p>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>