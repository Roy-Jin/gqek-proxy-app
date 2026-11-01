<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-gray-900">开发者调试</h2>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input v-model="enabled" type="checkbox" class="h-4 w-4 accent-primary" />
          记录日志
        </label>
        <button
          type="button"
          class="text-sm text-gray-500 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
          @click="back"
        >
          返回
        </button>
      </div>
    </div>

    <!-- API tester -->
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
        class="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-auto max-h-60 whitespace-pre-wrap break-all"
      >{{ result }}</pre>
    </AppCard>

    <AppButton variant="secondary" block class="mb-4" @click="exportKey">
      导出密钥
    </AppButton>

    <!-- Log viewer -->
    <AppCard :padding="false">
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p class="text-sm font-medium text-gray-700">日志</p>
        <AppButton variant="ghost" size="sm" @click="clearLogs">清空</AppButton>
      </div>
      <div class="max-h-96 overflow-auto">
        <div v-if="!enabled" class="py-10 text-center text-gray-400 text-sm">
          日志记录未开启
        </div>
        <div v-else-if="logs.length === 0" class="py-10 text-center text-gray-400 text-sm">
          暂无日志
        </div>
        <div
          v-for="entry in logs"
          :key="entry.id"
          class="px-4 py-2 text-xs border-b border-gray-50 last:border-0"
        >
          <div class="flex items-center gap-2">
            <span class="text-gray-400 shrink-0">{{ entry.time }}</span>
            <span class="font-medium shrink-0" :class="levelClass(entry.level)">{{ entry.level.toUpperCase() }}</span>
          </div>
          <p class="mt-1 text-gray-700 break-all">{{ entry.args.join(' ') }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { http } from "@/api";
import { useDebugLog } from "@/utils/logger";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

const auth = useGlobal();
const router = useRouter();
const toast = useToast();
const { logs, clearLogs, enabled } = useDebugLog();

const method = ref<"get" | "post">("get");
const path = ref("/system/team/list");
const payload = ref("");
const result = ref("");
const requesting = ref(false);

function back() {
  router.back();
}

function levelClass(level: string) {
  const map: Record<string, string> = {
    error: "text-red-500",
    warn: "text-amber-500",
    info: "text-blue-500",
    debug: "text-gray-400",
    log: "text-gray-500",
  };
  return map[level] ?? "text-gray-500";
}

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
    result.value = "请求失败: " + (e instanceof Error ? e.message : String(e));
  } finally {
    requesting.value = false;
  }
}

async function exportKey() {
  const key = auth.token;
  if (!key) {
    toast.error("暂无密钥可导出");
    return;
  }
  try {
    await navigator.clipboard.writeText(key);
    toast.success("密钥已复制到剪贴板");
  } catch {
    fallbackCopy(key);
  }
}

function fallbackCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (ok) {
    toast.success("密钥已复制到剪贴板");
  } else {
    toast.error("复制失败，请手动复制");
  }
}
</script>