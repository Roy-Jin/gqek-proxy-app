<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
    <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">我的待办</h2>
        <p class="mt-0.5 text-sm text-gray-500">跟踪需要处理的消息</p>
      </div>
      <AppButton variant="secondary" size="sm" :loading="loading" @click="refresh">
        <AppIcon name="refresh" class="h-4 w-4" />
        刷新
      </AppButton>
    </div>

    <AppSegmentedTabs :items="tabs" :active="activeTab" @change="switchTab" />

    <!-- Approval action bar -->
    <div v-if="activeTab === 0 && selectedIds.length > 0" class="sticky bottom-2 z-10 mt-4">
      <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-lg">
        <button type="button" class="flex items-center gap-1.5 text-sm text-gray-600 select-none" @click="toggleSelectAll">
          <AppCheckCircle :checked="allSelected" />
          全选
        </button>
        <span class="text-sm text-gray-500">已选 <span class="font-semibold text-primary-fg">{{ selectedIds.length }}</span> 项</span>
        <span class="flex-1"></span>
        <AppButton variant="secondary" size="sm" @click="clearSelection">取消</AppButton>
        <AppButton variant="primary" size="sm" :loading="approving" @click="runAudit(1)">通过</AppButton>
        <AppButton variant="danger" size="sm" @click="showRejectConfirm = true">驳回</AppButton>
      </div>
    </div>

    <AppCard :padding="false">
      <!-- Loading skeleton -->
      <div v-if="loading && rows.length === 0" class="divide-y divide-gray-100">
        <AppSkeletonRows />
      </div>

      <!-- Message list -->
      <ul v-else-if="rows.length > 0" class="divide-y divide-gray-100">
        <li
          v-for="row in rows"
          :key="row.businessId"
          class="px-4 sm:px-5 py-3.5 transition-colors flex gap-3"
          :class="[activeTab === 0 && selectedIds.includes(row.businessId) ? 'bg-primary-soft' : 'hover:bg-gray-50', activeTab === 0 ? 'cursor-pointer' : '']"
          @click="activeTab === 0 && toggleSelect(row.businessId)"
        >
          <label v-if="activeTab === 0" class="shrink-0 mt-0.5 cursor-pointer select-none" @click.stop>
            <input
              type="checkbox"
              class="sr-only"
              :checked="selectedIds.includes(row.businessId)"
              @change="toggleSelect(row.businessId)"
            />
            <AppCheckCircle :checked="selectedIds.includes(row.businessId)" />
          </label>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">{{ row.fromUserName }}</p>
              <span class="shrink-0 text-xs text-gray-400">{{ row.createTime }}</span>
            </div>
            <p class="mt-0.5 text-sm text-gray-700 truncate">{{ row.messageTitle }}</p>
            <p class="mt-0.5 text-xs text-gray-500 line-clamp-2">{{ row.messageContent }}</p>
          </div>
        </li>
      </ul>

      <AppEmpty v-else-if="!loading" text="暂无待办消息" />
    </AppCard>

    <AppPagination
      v-if="total > 0"
      :page="pageNum"
      :total="total"
      :page-size="pageSize"
      :loading="loading"
      @change="changePage"
    />

    <p v-if="errorMsg" class="mt-4 text-sm text-red-600">{{ errorMsg }}</p>

    <AppModal :open="showRejectConfirm" title="驳回确认" @close="showRejectConfirm = false">
      <p class="mt-2 text-sm text-gray-500 text-center">确定驳回所选 {{ selectedIds.length }} 项吗？</p>
      <div class="mt-4 flex gap-2">
        <AppButton variant="secondary" class="flex-1" @click="showRejectConfirm = false">取消</AppButton>
        <AppButton variant="danger" class="flex-1" :loading="approving" @click="confirmReject">确认驳回</AppButton>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { listTodoApp, auditInfo } from "@/api";
import type { TodoMessage } from "@/api";
import { useToast } from "@/composables/useToast";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppModal from "@/components/ui/AppModal.vue";
import AppPagination from "@/components/ui/AppPagination.vue";
import AppSegmentedTabs from "@/components/ui/AppSegmentedTabs.vue";
import AppCheckCircle from "@/components/ui/AppCheckCircle.vue";
import AppSkeletonRows from "@/components/ui/AppSkeletonRows.vue";

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