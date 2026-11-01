<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "text" | "password" | "textarea";
    label?: string;
    placeholder?: string;
    error?: string;
    autocomplete?: string;
    disabled?: boolean;
  }>(),
  {
    type: "text",
    label: "",
    placeholder: "",
    error: "",
    autocomplete: "",
    disabled: false,
  }
);

const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-gray-700">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      v-model="model"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="3"
      class="w-full px-3 py-2 text-sm rounded-lg border bg-white outline-none transition-colors focus:ring-2 focus:ring-primary/25 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
      :class="error ? 'border-red-400' : 'border-gray-300 focus:border-primary'"
    ></textarea>
    <input
      v-else
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      class="w-full px-3 py-2 text-sm rounded-lg border bg-white outline-none transition-colors focus:ring-2 focus:ring-primary/25 disabled:bg-gray-50 disabled:text-gray-400"
      :class="error ? 'border-red-400' : 'border-gray-300 focus:border-primary'"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>