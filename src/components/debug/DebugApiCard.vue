<template>
  <section class="mb-4 rounded-lg bg-surface-low p-4">
    <h3 class="mb-3 text-base font-medium text-on-surface">API 调试</h3>
    <div class="flex gap-2">
      <VarSelect
        v-model="method"
        class="debug-field w-28 shrink-0"
        variant="outlined"
        :hint="false"
        :options="methodOptions"
      />
      <VarInput
        v-model="path"
        class="debug-field min-w-0 flex-1"
        variant="outlined"
        placeholder="/system/team/list"
        clearable
        :hint="false"
      />
    </div>
    <VarInput
      v-model="payload"
      class="debug-field mt-2"
      textarea
      variant="outlined"
      :rows="3"
      placeholder="参数（JSON，可留空）"
      :hint="false"
    />
    <VarButton
      type="primary"
      tonal
      size="small"
      class="mt-2"
      :loading="requesting"
      @click="runRequest"
    >
      发起请求
    </VarButton>
    <pre
      v-if="result"
      class="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface-high p-3 font-mono text-xs text-on-surface-variant"
    >{{ result }}</pre>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button as VarButton, Input as VarInput, Select as VarSelect } from "@varlet/ui";
import { http } from "@/api";
import { useToast } from "@/composables/useToast";
import { errorMessage } from "@/utils/error";

const toast = useToast();

const methodOptions = [
  { label: "GET", value: "get" },
  { label: "POST", value: "post" },
];

const method = ref<"get" | "post">("get");
const path = ref("/system/team/list");
const payload = ref("");
const result = ref("");
const requesting = ref(false);

async function runRequest() {
  const p = path.value.trim();
  if (!p) {
    toast.error("请输入接口路径");
    return;
  }
  let parsed: unknown;
  if (payload.value.trim()) {
    try {
      parsed = JSON.parse(payload.value);
    } catch {
      toast.error("参数不是合法 JSON");
      return;
    }
  }

  requesting.value = true;
  result.value = "";
  try {
    const url = p.startsWith("/") ? p : "/" + p;
    const res =
      method.value === "get"
        ? await http.get<unknown>(
            url,
            parsed && typeof parsed === "object" && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : undefined
          )
        : await http.post<unknown>(url, parsed);
    result.value = JSON.stringify(res.data, null, 2);
  } catch (e) {
    result.value = "请求失败: " + errorMessage(e);
  } finally {
    requesting.value = false;
  }
}
</script>

<style scoped>
.debug-field {
  --field-decorator-text-color: var(--md-on-surface);
  --field-decorator-blur-color: var(--md-outline);
  --field-decorator-focus-color: var(--md-primary);
  --field-decorator-line-border-radius: 12px;
}
</style>
