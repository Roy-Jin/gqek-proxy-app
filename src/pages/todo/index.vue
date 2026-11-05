<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-[22px] leading-7 font-medium text-on-surface">待办</h2>
        <p class="mt-1 text-sm text-on-surface-variant">跟踪需要处理的消息</p>
      </div>
      <VarButton text type="primary" size="small" :loading="loading" @click="refresh">
        <VarIcon name="refresh" :size="18" class="mr-1" />
        刷新
      </VarButton>
    </div>

    <div class="mt-4">
      <AppSegmented block :items="tabs" :active="activeTab" @change="switchTab" />
    </div>

    <div class="mt-3 flex items-center gap-3">
      <VarInput v-model="keyword" :hint="false" class="min-w-0 flex-1" placeholder="搜索一下" clearable>
        <template #prepend-icon>
          <VarIcon name="magnify" :size="20" class="text-on-surface-variant" />
        </template>
      </VarInput>
      <VarCheckbox v-if="activeTab === 0" class="shrink-0" :model-value="allSelected"
        :disabled="rows.length === 0 || loading" @change="toggleSelectAll">
        <span class="text-sm text-on-surface-variant">全选</span>
      </VarCheckbox>
    </div>

    <VarPaper class="mt-4 overflow-hidden" :elevation="0" :radius="16" style="--paper-background: var(--md-surface-container)">
      <!-- Loading skeleton -->
      <div v-if="loading && rows.length === 0" class="divide-y divide-outline-variant">
        <div v-for="i in 5" :key="i" class="animate-pulse space-y-2 p-4">
          <div class="h-3.5 w-1/4 rounded bg-surface-highest"></div>
          <div class="h-3 w-3/4 rounded bg-surface-high"></div>
          <div class="h-3 w-1/2 rounded bg-surface-high"></div>
        </div>
      </div>

      <!-- Message list: VarList pulls the next batch when the detector reaches the end -->
      <VarList v-else v-model:loading="loadingMore" :finished="noMore" :error="!!errorMsg" loading-text="加载中..."
        :offset="80" @load="loadMore">
        <ul v-if="rows.length > 0" class="divide-y divide-outline-variant">
          <li v-for="row in rows" :key="row.businessId" v-ripple="{ disabled: activeTab !== 0 }"
            class="px-4 py-3.5 flex gap-3" :class="[
              activeTab === 0 && selectedIds.includes(row.businessId) ? 'bg-primary-container' : '',
              activeTab === 0 ? 'cursor-pointer' : '',
            ]" @click="activeTab === 0 && toggleSelect(row.businessId)">
            <div v-if="activeTab === 0" class="shrink-0 mt-0.5" @click.stop>
              <VarCheckbox :model-value="selectedIds.includes(row.businessId)" @change="toggleSelect(row.businessId)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-sm font-medium text-on-surface truncate">{{ row.fromUserName }}</p>
                <span class="shrink-0 text-xs text-on-surface-variant">{{ row.createTime }}</span>
              </div>
              <p class="mt-0.5 text-sm text-on-surface truncate">{{ row.messageTitle }}</p>
              <p class="mt-0.5 text-xs text-on-surface-variant line-clamp-2">{{ row.messageContent }}</p>
            </div>
          </li>
        </ul>

        <template #finished>
          <AppEmpty v-if="rows.length === 0" :text="keyword.trim() ? '没有匹配的待办' : '暂无待办消息'" />
          <p v-else class="py-4 text-center text-sm text-on-surface-variant">
            共 {{ total }} 项 · 没有更多了
          </p>
        </template>

        <template #error>
          <p class="py-4 text-center text-sm text-error">{{ errorMsg }}</p>
        </template>
      </VarList>
    </VarPaper>

    <!-- Batch approval speed dial, only shown once something is selected -->
    <VarFab v-if="selectedIds.length > 0" v-model:active="fabActive" class="fab-inverse" :bottom="84" :right="16"
      inactive-icon="dots-vertical" active-icon="window-close" :inactive-icon-size="24" :active-icon-size="20">
      <VarButton type="primary" :disabled="approving" @click="onFabApprove" icon-container>
        <VarIcon name="check" :size="20" />
      </VarButton>
      <VarButton type="danger" :disabled="approving" @click="onFabReject" icon-container>
        <VarIcon name="close-circle-outline" :size="20" />
      </VarButton>
    </VarFab>

    <!-- Scroll target is the app shell's <main>, not the window -->
    <VarBackTop v-if="!fabActive" target="main" :visibility-height="320" :right="16"
      :bottom="selectedIds.length > 0 ? 152 : 84" />

    <!-- Shared confirm dialog; auditStatus 1 = approve, 2 = reject -->
    <VarDialog v-model:show="showConfirm" :title="auditStatus === 1 ? '通过确认' : '驳回确认'" message-align="center"
      width="86vw" :dialog-style="{ maxWidth: '20rem' }" close-on-click-overlay>
      <p class="text-sm text-on-surface-variant">
        确定{{ auditStatus === 1 ? "通过" : "驳回" }}所选 {{ selectedIds.length }} 项吗？
      </p>
      <template #actions>
        <div class="flex w-full gap-2 px-6 pb-6">
          <VarButton class="flex-1" type="primary" tonal @click="showConfirm = false">取消</VarButton>
          <VarButton class="flex-1" :type="auditStatus === 1 ? 'primary' : 'danger'" :loading="approving"
            @click="confirmAudit">
            {{ auditStatus === 1 ? "确认通过" : "确认驳回" }}
          </VarButton>
        </div>
      </template>
    </VarDialog>

    <!-- Result feedback for finished approvals -->
    <VarDialog v-model:show="showFeedback" width="80vw" :dialog-style="{ maxWidth: '18rem' }" close-on-click-overlay>
      <VarResult v-if="feedback" :type="feedback.type" :title="feedback.title" :description="feedback.description" />
      <template #actions>
        <div class="w-full px-6 pb-6">
          <VarButton block type="primary" @click="showFeedback = false">完成</VarButton>
        </div>
      </template>
    </VarDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  BackTop as VarBackTop,
  Button as VarButton,
  Checkbox as VarCheckbox,
  Dialog,
  Fab as VarFab,
  Icon as VarIcon,
  Input as VarInput,
  List as VarList,
  Paper as VarPaper,
  Result as VarResult,
  Ripple as vRipple,
} from "@varlet/ui";
import { listTodoApp, auditInfo } from "@/api";
import type { TodoMessage } from "@/api";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppSegmented from "@/components/ui/AppSegmented.vue";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const PAGE_SIZE = 10;
const total = ref(0);
const rows = ref<TodoMessage[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const errorMsg = ref("");
const approving = ref(false);
const auditStatus = ref<1 | 2>(1);
const showConfirm = ref(false);
const showFeedback = ref(false);
const feedback = ref<{ type: "success" | "error"; title: string; description: string } | null>(null);
const fabActive = ref(false);
const keyword = ref("");

const noMore = ref(false);

let pageNum = 1;
let requestSeq = 0;
/** Server only filters by title; when that returns nothing we scan pages locally */
let localFilter = false;

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(rows, (row) => row.businessId);

// Filter values match the record field enum: 0 = todo, 2 = done
const tabs: { label: string; value: number }[] = [
  { label: "待办", value: 0 },
  { label: "已办", value: 2 },
];

const activeTab = ref<number>(0);

/** Min gap between refresh taps; only absorbs repeat clicks. */
const REFRESH_GAP_MS = 400;

let lastRequestAt = 0;
let gapTimer: ReturnType<typeof setTimeout> | null = null;

/** Local fallback matches every field shown in the list, since the API only searches titles. */
function matchesKeyword(row: TodoMessage, needle: string): boolean {
  return [row.fromUserName, row.messageTitle, row.messageContent].some((field) =>
    field.toLowerCase().includes(needle)
  );
}

/** Load one batch; `reset` drops existing rows and restarts from page 1. */
async function fetchBatch(reset: boolean) {
  const seq = ++requestSeq;
  lastRequestAt = Date.now();
  errorMsg.value = "";
  const needle = keyword.value.trim();
  if (reset) {
    pageNum = 1;
    rows.value = [];
    total.value = 0;
    noMore.value = false;
    localFilter = false;
    clearSelection();
    loading.value = true;
  }
  try {
    while (true) {
      const body = (
        await listTodoApp({
          pageSize: PAGE_SIZE,
          pageNum,
          platform: 1,
          messageStatus: activeTab.value,
          messageTitle: localFilter ? undefined : needle || undefined,
        })
      ).data;
      if (seq !== requestSeq) return;
      if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);

      // Title search hit nothing: drop the param and scan the raw first page in the client
      if (!localFilter && needle && pageNum === 1 && body.rows.length === 0) {
        localFilter = true;
        pageNum = 1;
        continue;
      }

      pageNum++;
      const matched = localFilter
        ? body.rows.filter((row) => matchesKeyword(row, needle.toLowerCase()))
        : body.rows;
      rows.value.push(...matched);
      total.value = localFilter ? rows.value.length : body.total;

      const sourceExhausted = body.rows.length < PAGE_SIZE;
      if (sourceExhausted || (!localFilter && rows.value.length >= total.value)) {
        noMore.value = true;
        break;
      }
      // Server mode needs one page only; local mode keeps scanning pages that produced no match
      if (!localFilter || matched.length > 0) break;
    }
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = errorMessage(e);
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

async function loadMore() {
  // First page still loading: keep VarList paused; fetchBatch clears the flag when done.
  if (loading.value) return;
  if (noMore.value) {
    loadingMore.value = false;
    return;
  }
  await fetchBatch(false);
}

/** Debounced title search; typing restarts from page 1 */
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchTimer = null;
    fabActive.value = false;
    fetchBatch(true);
  }, 300);
});

function switchTab(status: number) {
  if (activeTab.value === status) return;
  fabActive.value = false;
  activeTab.value = status;
  fetchBatch(true);
}

function refresh() {
  if (loading.value || loadingMore.value) return;
  const wait = Math.max(0, REFRESH_GAP_MS - (Date.now() - lastRequestAt));
  if (wait === 0) {
    fetchBatch(true);
    return;
  }
  if (gapTimer) return;
  gapTimer = setTimeout(() => {
    gapTimer = null;
    fetchBatch(true);
  }, wait);
}

function confirmAudit() {
  showConfirm.value = false;
  runAudit(auditStatus.value);
}

// Fab actions close the speed dial first so the page state is not left open behind dialogs
function onFabApprove() {
  fabActive.value = false;
  auditStatus.value = 1;
  showConfirm.value = true;
}

function onFabReject() {
  fabActive.value = false;
  auditStatus.value = 2;
  showConfirm.value = true;
}

// Selection can be cleared by refresh, approval or a tab switch; keep the dial closed
watch(
  () => selectedIds.value.length,
  (length) => {
    if (length === 0) fabActive.value = false;
  }
);

async function runAudit(status: 1 | 2) {
  const count = selectedIds.value.length;
  if (count === 0) return;
  const ids = [...selectedIds.value];
  approving.value = true;
  try {
    const body = (await auditInfo({ ids, auditStatus: status, auditOption: "" })).data;
    if (body.code !== 200) throw new Error(body.msg || `操作失败（${body.code}）`);
    feedback.value = {
      type: "success",
      title: status === 1 ? "已通过" : "已驳回",
      description: `已处理 ${count} 项待办`,
    };
    showFeedback.value = true;
    fetchBatch(true);
  } catch (e) {
    feedback.value = {
      type: "error",
      title: "操作失败",
      description: errorMessage(e),
    };
    showFeedback.value = true;
  } finally {
    approving.value = false;
  }
}

onMounted(() => fetchBatch(true));

onUnmounted(() => {
  if (gapTimer) clearTimeout(gapTimer);
  gapTimer = null;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = null;
});
</script>
