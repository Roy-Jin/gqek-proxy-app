<template>
  <VarPopup :show="open" position="bottom" :default-style="false" safe-area @update:show="onUpdateShow"
    @close="emit('close')">
    <div class="app-card flex h-[88vh] w-full flex-col overflow-hidden rounded-t-xl sm:mx-auto sm:max-w-lg sm:rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 sm:px-5">
        <p class="text-base font-semibold text-on-surface">报名审核</p>
        <VarButton icon-container text round size="small" text-color="var(--md-on-surface-variant)" aria-label="关闭"
          @click="emit('close')">
          <X :size="20" />
        </VarButton>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="loading && rows.length === 0" class="divide-y divide-outline-variant">
          <div v-for="i in 5" :key="i" class="animate-pulse space-y-2 p-4">
            <div class="h-3.5 w-1/4 rounded bg-surface-highest"></div>
            <div class="h-3 w-3/4 rounded bg-surface-high"></div>
            <div class="h-3 w-1/2 rounded bg-surface-high"></div>
          </div>
        </div>

        <ul v-else-if="filteredRows.length > 0" class="divide-y divide-outline-variant">
          <li v-for="row in filteredRows" :key="row.businessId" v-ripple
            class="flex gap-3 px-4 py-3.5 sm:px-5 cursor-pointer"
            :class="selectedIds.includes(row.businessId) ? 'bg-primary-container' : ''"
            @click="toggleSelect(row.businessId)">
            <VarCheckbox :model-value="selectedIds.includes(row.businessId)" class="shrink-0 mt-0.5" @click.stop
              @change="toggleSelect(row.businessId)" />
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

        <AppEmpty v-else-if="!loading" text="暂无可审核的报名" />
      </div>

      <!-- Footer actions -->
      <div v-if="filteredRows.length > 0" class="border-t border-outline-variant px-4 py-3 sm:px-5">
        <div class="flex items-center gap-3">
          <VarCheckbox :model-value="allSelected" class="select-none text-sm" @change="toggleSelectAll">
            全选
          </VarCheckbox>
          <span class="text-xs text-on-surface-variant">已选 {{ selectedIds.length }} / {{ filteredRows.length }}</span>
        </div>
        <div class="mt-3 flex gap-2">
          <VarButton class="flex-1" type="danger" tonal :loading="approving" :disabled="selectedIds.length === 0"
            @click="askAudit(2)">驳回</VarButton>
          <VarButton class="flex-2" type="primary" :loading="approving" :disabled="selectedIds.length === 0"
            @click="askAudit(1)">通过</VarButton>
        </div>
      </div>

      <!-- Error -->
      <p v-if="errorMsg" class="border-t border-outline-variant px-4 py-2 text-sm text-error sm:px-5">
        {{ errorMsg }}
      </p>
    </div>
  </VarPopup>

  <!-- Audit confirmation -->
  <VarDialog v-model:show="showConfirm" :title="auditStatus === 1 ? '通过确认' : '驳回确认'" width="86vw"
    :dialog-style="{ maxWidth: '20rem' }" close-on-click-overlay>
    <p class="text-sm text-on-surface-variant">
      确定{{ auditStatus === 1 ? "通过" : "驳回" }}所选 {{ selectedIds.length }} 项报名吗？
    </p>
    <template #actions>
      <div class="flex w-full gap-2 px-6 pb-6">
        <VarButton class="flex-1" type="primary" tonal @click="showConfirm = false">取消</VarButton>
        <VarButton class="flex-1" :type="auditStatus === 1 ? 'primary' : 'danger'" :loading="approving"
          @click="runAudit">
          确认{{ auditStatus === 1 ? "通过" : "驳回" }}
        </VarButton>
      </div>
    </template>
  </VarDialog>

  <!-- Result feedback -->
  <VarDialog v-model:show="showFeedback" width="80vw" :dialog-style="{ maxWidth: '18rem' }" close-on-click-overlay>
    <VarResult v-if="feedback" :type="feedback.type" :title="feedback.title" :description="feedback.description" />
    <template #actions>
      <div class="w-full px-6 pb-6">
        <VarButton block type="primary" @click="showFeedback = false">完成</VarButton>
      </div>
    </template>
  </VarDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X } from "@lucide/vue";
import {
  Button as VarButton,
  Checkbox as VarCheckbox,
  Dialog,
  Popup as VarPopup,
  Result as VarResult,
  Ripple,
} from "@varlet/ui";
import { auditInfo, listTodoApp } from "@/api";
import type { TodoMessage } from "@/api";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";

const VarDialog = Dialog.Component;
const vRipple = Ripple;

const props = defineProps<{
  open: boolean;
  activityId: string;
  activityName: string;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();

const rows = ref<TodoMessage[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const approving = ref(false);

const auditStatus = ref<1 | 2>(1);
const showConfirm = ref(false);
const showFeedback = ref(false);
const feedback = ref<{ type: "success" | "error"; title: string; description: string } | null>(null);

const filteredRows = computed(() =>
  rows.value.filter(
    (r) =>
      r.messageTitle === "活动单人报名" &&
      r.messageContent.trim() === props.activityName.trim()
  )
);

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(filteredRows, (row) => row.businessId);

function onUpdateShow(value: boolean) {
  if (!value) emit("close");
}

async function fetchList() {
  if (!props.activityName) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const body = (
      await listTodoApp({
        pageSize: 50,
        pageNum: 1,
        platform: 1,
        messageStatus: 0,
        messageTitle: "活动单人报名",
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    rows.value = body.rows;
  } catch (e) {
    errorMsg.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function askAudit(status: 1 | 2) {
  if (selectedIds.value.length === 0) return;
  auditStatus.value = status;
  showConfirm.value = true;
}

async function runAudit() {
  const count = selectedIds.value.length;
  if (count === 0) return;
  const ids = [...selectedIds.value];
  showConfirm.value = false;
  approving.value = true;
  try {
    const body = (await auditInfo({ ids, auditStatus: auditStatus.value, auditOption: "" })).data;
    if (body.code !== 200) throw new Error(body.msg || `操作失败（${body.code}）`);
    feedback.value = {
      type: "success",
      title: auditStatus.value === 1 ? "已通过" : "已驳回",
      description: `已处理 ${count} 项报名审核`,
    };
    showFeedback.value = true;
    emit("changed");
  } catch (e) {
    feedback.value = { type: "error", title: "操作失败", description: errorMessage(e) };
    showFeedback.value = true;
  } finally {
    fetchList();
    approving.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    rows.value = [];
    clearSelection();
    errorMsg.value = "";
    fetchList();
  }
);
</script>
