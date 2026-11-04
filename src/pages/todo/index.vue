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

    <AppSegmented class="mt-4" :items="tabs" :active="activeTab" @change="switchTab" />

    <!-- Approval action bar -->
    <div v-if="activeTab === 0 && selectedIds.length > 0" class="sticky bottom-2 z-10 mt-4">
      <div class="flex items-center gap-3 p-3 bg-surface-high rounded-lg shadow-e2">
        <VarCheckbox
          class="shrink-0"
          :model-value="allSelected"
          @change="toggleSelectAll"
        >
          <span class="text-sm text-on-surface-variant">全选</span>
        </VarCheckbox>
        <span class="text-sm text-on-surface-variant">已选 <span class="font-semibold text-primary">{{ selectedIds.length }}</span> 项</span>
        <span class="flex-1"></span>
        <VarButton type="primary" tonal size="small" @click="clearSelection">取消</VarButton>
        <VarButton type="primary" size="small" :loading="approving" @click="runAudit(1)">通过</VarButton>
        <VarButton type="danger" size="small" @click="showRejectConfirm = true">驳回</VarButton>
      </div>
    </div>

    <div class="mt-4 bg-surface-low rounded-lg overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="loading && rows.length === 0" class="divide-y divide-outline-variant">
        <div v-for="i in 5" :key="i" class="animate-pulse space-y-2 p-4">
          <div class="h-3.5 w-1/4 rounded bg-surface-highest"></div>
          <div class="h-3 w-3/4 rounded bg-surface-high"></div>
          <div class="h-3 w-1/2 rounded bg-surface-high"></div>
        </div>
      </div>

      <!-- Message list -->
      <ul v-else-if="rows.length > 0" class="divide-y divide-outline-variant">
        <li
          v-for="row in rows"
          :key="row.businessId"
          v-ripple="{ disabled: activeTab !== 0 }"
          class="px-4 py-3.5 flex gap-3"
          :class="[
            activeTab === 0 && selectedIds.includes(row.businessId) ? 'bg-primary-container' : '',
            activeTab === 0 ? 'cursor-pointer' : '',
          ]"
          @click="activeTab === 0 && toggleSelect(row.businessId)"
        >
          <div v-if="activeTab === 0" class="shrink-0 mt-0.5" @click.stop>
            <VarCheckbox
              :model-value="selectedIds.includes(row.businessId)"
              @change="toggleSelect(row.businessId)"
            />
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

      <AppEmpty v-else-if="!loading" text="暂无待办消息" />
    </div>

    <div v-if="total > 0" class="mt-4 flex items-center justify-between gap-3">
      <p class="text-sm text-on-surface-variant">
        共 <span class="font-medium text-on-surface">{{ total }}</span> 条
      </p>
      <VarPagination
        :current="pageNum"
        :size="pageSize"
        :total="total"
        simple
        @change="changePage"
      />
    </div>

    <p v-if="errorMsg" class="mt-4 text-sm text-error">{{ errorMsg }}</p>

    <VarDialog
      v-model:show="showRejectConfirm"
      title="驳回确认"
      message-align="center"
      width="86vw"
      :dialog-style="{ maxWidth: '20rem' }"
      close-on-click-overlay
    >
      <p class="text-sm text-on-surface-variant">确定驳回所选 {{ selectedIds.length }} 项吗？</p>
      <template #actions>
        <div class="flex w-full gap-2 px-6 pb-6">
          <VarButton class="flex-1" type="primary" tonal @click="showRejectConfirm = false">取消</VarButton>
          <VarButton class="flex-1" type="danger" :loading="approving" @click="confirmReject">确认驳回</VarButton>
        </div>
      </template>
    </VarDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  Button as VarButton,
  Checkbox as VarCheckbox,
  Dialog,
  Icon as VarIcon,
  Pagination as VarPagination,
  Ripple as vRipple,
} from "@varlet/ui";
import { listTodoApp, auditInfo } from "@/api";
import type { TodoMessage } from "@/api";
import { useToast } from "@/composables/useToast";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppSegmented from "@/components/ui/AppSegmented.vue";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const pageSize = 10;
const pageNum = ref(1);
const total = ref(0);
const rows = ref<TodoMessage[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const approving = ref(false);
const showRejectConfirm = ref(false);

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(rows, (row) => row.businessId);

const toast = useToast();

// Filter values match the record field enum: 0 = todo, 2 = done
const tabs: { label: string; value: number }[] = [
  { label: "待办", value: 0 },
  { label: "已办", value: 2 },
];

const activeTab = ref<number>(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

/** Min gap between refresh taps; only absorbs repeat clicks. */
const REFRESH_GAP_MS = 400;

let requestSeq = 0;
let lastRequestAt = 0;
let gapTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchList() {
  const seq = ++requestSeq;
  lastRequestAt = Date.now();
  loading.value = true;
  errorMsg.value = "";
  clearSelection();
  try {
    const body = (
      await listTodoApp({
        pageSize,
        pageNum: pageNum.value,
        platform: 1,
        messageStatus: activeTab.value,
      })
    ).data;
    if (seq !== requestSeq) return;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    rows.value = body.rows;
    total.value = body.total;
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = errorMessage(e);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function switchTab(status: number) {
  if (activeTab.value === status) return;
  activeTab.value = status;
  pageNum.value = 1;
  // Clear the previous tab's rows so no stale cross-tab data stays visible.
  rows.value = [];
  total.value = 0;
  fetchList();
}

function changePage(p: number) {
  if (p < 1 || p > totalPages.value || p === pageNum.value) return;
  pageNum.value = p;
  fetchList();
}

function refresh() {
  if (loading.value) return;
  const wait = Math.max(0, REFRESH_GAP_MS - (Date.now() - lastRequestAt));
  if (wait === 0) {
    fetchList();
    return;
  }
  if (gapTimer) return;
  gapTimer = setTimeout(() => {
    gapTimer = null;
    fetchList();
  }, wait);
}

function confirmReject() {
  showRejectConfirm.value = false;
  runAudit(2);
}

async function runAudit(auditStatus: number) {
  if (selectedIds.value.length === 0) return;
  approving.value = true;
  try {
    const body = (
      await auditInfo({ ids: [...selectedIds.value], auditStatus, auditOption: "" })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `操作失败（${body.code}）`);
    toast.success("操作成功");
    fetchList();
  } catch (e) {
    toast.error(errorMessage(e));
  } finally {
    approving.value = false;
  }
}

onMounted(fetchList);

onUnmounted(() => {
  if (gapTimer) clearTimeout(gapTimer);
  gapTimer = null;
});
</script>
