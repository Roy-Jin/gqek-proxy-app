<template>
  <div class="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
    <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">我的代办</h2>
        <p class="mt-0.5 text-sm text-gray-500">跟踪需要处理的消息</p>
      </div>
      <AppButton variant="secondary" size="sm" :loading="loading" @click="refresh">
        <AppIcon name="refresh" class="h-4 w-4" />
        刷新
      </AppButton>
    </div>

    <div class="flex p-1 rounded-lg bg-gray-100 w-fit mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.status"
        type="button"
        class="px-4 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap"
        :class="
          activeTab === tab.status
            ? 'bg-white text-gray-900 shadow-sm font-medium'
            : 'text-gray-500 hover:text-gray-700'
        "
        @click="switchTab(tab.status)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Approval action bar -->
    <div v-if="activeTab === 0 && selectedIds.length > 0" class="sticky bottom-2 z-10 mt-4">
      <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-lg">
        <button type="button" class="flex items-center gap-1.5 text-sm text-gray-600 select-none" @click="toggleSelectAll">
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150"
            :class="allSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white text-transparent'"
          >
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
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
        <div v-for="i in 5" :key="i" class="p-4 sm:p-5 animate-pulse space-y-2">
          <div class="h-3.5 bg-gray-200 rounded w-1/4"></div>
          <div class="h-3 bg-gray-100 rounded w-3/4"></div>
          <div class="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
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
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-150"
              :class="selectedIds.includes(row.businessId) ? 'bg-primary border-primary text-white' : 'border-gray-300 bg-white text-transparent'"
            >
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
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

      <AppEmpty v-else-if="!loading" text="暂无代办消息" />
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
import { ref, computed, onMounted } from "vue";
import { listTodoApp, auditInfo } from "@/api";
import type { TodoMessage } from "@/api";
import { useToast } from "@/composables/useToast";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppCard from "@/components/ui/AppCard.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppModal from "@/components/ui/AppModal.vue";
import AppPagination from "@/components/ui/AppPagination.vue";

const pageSize = 10;
const pageNum = ref(1);
const total = ref(0);
const rows = ref<TodoMessage[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const selectedIds = ref<string[]>([]);
const approving = ref(false);
const showRejectConfirm = ref(false);

const toast = useToast();

// Filter values match the record field enum: 0 = todo, 2 = done
const tabs = [
  { label: "待办", status: 0 },
  { label: "已办", status: 2 },
] as const;

const activeTab = ref<number>(0);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

const allSelected = computed(() =>
  rows.value.length > 0 && rows.value.every((r) => selectedIds.value.includes(r.businessId))
);

let requestSeq = 0;

async function fetchList() {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = "";
  selectedIds.value = [];
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
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function switchTab(status: number) {
  if (activeTab.value === status) return;
  activeTab.value = status;
  pageNum.value = 1;
  fetchList();
}

function changePage(p: number) {
  if (p < 1 || p > totalPages.value || p === pageNum.value) return;
  pageNum.value = p;
  fetchList();
}

function refresh() {
  fetchList();
}

function toggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id);
  if (i >= 0) selectedIds.value.splice(i, 1);
  else selectedIds.value.push(id);
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = rows.value.map((r) => r.businessId);
  }
}

function clearSelection() {
  selectedIds.value = [];
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
    toast.error(e instanceof Error ? e.message : String(e));
  } finally {
    approving.value = false;
  }
}

onMounted(fetchList);
</script>