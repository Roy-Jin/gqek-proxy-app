<template>
  <AppCard class="mb-4">
    <p class="text-sm font-medium text-gray-700 mb-3">API 调试</p>
    <div class="flex gap-2 mb-2">
      <select
        v-model="method"
        class="px-2 py-2 text-sm rounded-lg border border-gray-300 bg-white outline-none focus:border-primary"
      >
        <option value="get">GET</option>
        <option value="post">POST</option>
      </select>
      <input
        v-model="path"
        type="text"
        placeholder="/system/team/list"
        class="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
    </div>
    <textarea
      v-model="payload"
      rows="3"
      placeholder="参数（JSON，可留空）"
      class="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 resize-none"
    ></textarea>
    <AppButton variant="secondary" size="sm" class="mt-2" :loading="requesting" @click="runRequest">
      发起请求
    </AppButton>
    <pre
      v-if="result"
      class="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-auto whitespace-pre-wrap break-all"
    >{{ result }}</pre>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { http } from "@/api";
import { useToast } from "@/composables/useToast";
import { errorMessage } from "@/utils/error";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const toast = useToast();

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
