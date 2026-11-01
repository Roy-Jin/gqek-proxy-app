<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: "button" | "submit";
  }>(),
  {
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    type: "button",
  }
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();

const classes = computed(() => {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    ghost: "text-primary hover:bg-primary-soft",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
  };
  const sizes: Record<Size, string> = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };
  return [base, variants[props.variant], sizes[props.size], props.block ? "w-full" : ""].join(
    " "
  );
});

function onClick(event: MouseEvent) {
  if (props.loading || props.disabled) return;
  emit("click", event);
}
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    @click="onClick"
  >
    <span
      v-if="loading"
      class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    ></span>
    <slot />
  </button>
</template>