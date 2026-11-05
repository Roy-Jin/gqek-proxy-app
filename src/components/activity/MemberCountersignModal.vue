<template>
  <VarPopup :show="open" position="bottom" :default-style="false" safe-area @update:show="onUpdateShow"
    @close="emit('close')">
    <div
      class="app-card flex h-[88vh] w-full flex-col overflow-hidden rounded-t-xl sm:mx-auto sm:max-w-lg sm:rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 sm:px-5">
        <p class="text-base font-semibold text-on-surface">成员补签</p>
        <VarButton icon-container text round size="small" text-color="var(--md-on-surface-variant)" aria-label="关闭"
          @click="emit('close')">
          <X :size="20" />
        </VarButton>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 border-b border-outline-variant px-4 py-3 sm:px-5">
        <VarSelect v-model="filterMode" variant="outlined" size="small" placeholder="未筛选" :options="filterOptions"
          :hint="false" class="w-28 shrink-0" @change="clearSelection" />
        <VarInput v-model="keyword" variant="outlined" size="small" clearable placeholder="搜索姓名/学号/学院/班级"
          class="min-w-0 flex-1">
          <template #prepend-icon>
            <Search :size="18" />
          </template>
        </VarInput>
      </div>

      <!-- Member list -->
      <div class="flex-1 overflow-y-auto">
        <VarSkeleton v-if="loading && members.length === 0" :loading="true" title :rows="6" class="p-4" />

        <ul v-else-if="displayMembers.length > 0" class="divide-y divide-outline-variant">
          <li v-for="m in displayMembers" :key="m.studentId" v-ripple
            class="relative flex cursor-pointer gap-3 overflow-hidden px-4 py-3.5 sm:px-5"
            :class="selectedIds.includes(m.studentId) ? 'bg-primary-container' : ''" @click="toggleSelect(m.studentId)">
            <VarCheckbox :model-value="selectedIds.includes(m.studentId)" class="mt-0.5 shrink-0" @click.stop
              @change="toggleSelect(m.studentId)" />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <p class="truncate text-sm font-medium text-on-surface">{{ m.studentName || '—' }}</p>
                <span class="shrink-0 text-xs text-on-surface-variant">{{ m.userName || '' }}</span>
              </div>
              <p class="mt-0.5 truncate text-xs text-on-surface-variant">{{ m.collegeName }} · {{ m.className }}</p>
              <p class="mt-0.5 text-xs text-on-surface-variant">签到 {{ m.signNum }} 次 · 签退 {{ m.signOutNum }} 次</p>
            </div>
          </li>
        </ul>

        <AppEmpty v-else-if="!loading" :text="filterMode || keyword.trim() ? '没有符合条件的成员' : '暂无成员数据'" />
      </div>

      <p v-if="errorMsg" class="border-t border-outline-variant px-4 py-2 text-sm text-error sm:px-5">
        {{ errorMsg }}
      </p>

      <!-- Action bar -->
      <div v-if="selectedIds.length > 0"
        class="flex items-center gap-2 border-t border-outline-variant px-4 py-3 sm:px-5">
        <VarCheckbox :model-value="allSelected" class="select-none text-sm" @change="toggleSelectAll">
          全选
        </VarCheckbox>
        <span class="text-sm text-on-surface-variant">已选 <span class="font-semibold text-primary">{{ selectedIds.length
            }}</span> 人</span>
        <span class="flex-1"></span>
        <VarButton type="primary" @click="doCountersign('0')">补签到</VarButton>
        <VarButton type="danger" @click="doCountersign('1')">补签退</VarButton>
      </div>
    </div>
  </VarPopup>

  <!-- Result feedback for finished countersign -->
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
import { Search, X } from "@lucide/vue";
import {
  Button as VarButton,
  Checkbox as VarCheckbox,
  Dialog,
  Input as VarInput,
  Popup as VarPopup,
  Result as VarResult,
  Select as VarSelect,
  Skeleton as VarSkeleton,
  Ripple,
} from "@varlet/ui";
import { listActivityMembers, countersign } from "@/api";
import type { MemberInfo } from "@/api";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const vRipple = Ripple;

const props = defineProps<{ open: boolean; activityId: string }>();
const emit = defineEmits<{ close: [] }>();

const members = ref<MemberInfo[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const keyword = ref("");
const filterMode = ref("");
const countersigning = ref(false);
const menuShow = ref(false);
const showFeedback = ref(false);
const feedback = ref<{ type: "success" | "error"; title: string; description: string } | null>(null);

const filterOptions = [
  { label: "未筛选", value: "" },
  { label: "已完成", value: "completed" },
  { label: "未签到", value: "no-sign-in" },
  { label: "未签退", value: "no-sign-out" },
  { label: "未打卡", value: "unchecked" },
];

// Server does not implement signFlag filtering, so filter by local sign counts
const displayMembers = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  const matchedMembers = query
    ? members.value.filter((member) =>
      [member.studentName, member.userName, member.studentId, member.collegeName, member.majorName, member.className]
        .some((value) => (value ?? "").toLowerCase().includes(query))
    )
    : members.value;

  switch (filterMode.value) {
    case "completed":
      return matchedMembers.filter((member) => !!member.signNum && !!member.signOutNum);
    case "no-sign-in":
      return matchedMembers.filter((member) => !member.signNum);
    case "no-sign-out":
      return matchedMembers.filter((member) => !member.signOutNum);
    case "unchecked":
      return matchedMembers.filter((member) => !member.signNum && !member.signOutNum);
    default:
      return matchedMembers;
  }
});

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(displayMembers, (member) => member.studentId);

// Hidden selections must not survive a filter change
watch(keyword, clearSelection);

let requestSeq = 0;

function onUpdateShow(value: boolean) {
  if (!value) emit("close");
}

async function fetchList() {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = "";
  clearSelection();
  try {
    const body = (
      await listActivityMembers({
        activityId: props.activityId,
        // Keep server-side filters empty; filtering is handled locally
        signFlag: "",
        userName: "",
      })
    ).data;
    if (seq !== requestSeq) return;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    members.value = body.rows;
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = errorMessage(e);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

async function doCountersign(signType: string) {
  if (selectedIds.value.length === 0) return;
  const count = selectedIds.value.length;
  const action = signType === "0" ? "补签到" : "补签退";
  countersigning.value = true;
  try {
    const body = (
      await countersign({
        activityId: props.activityId,
        signMode: "1",
        signType,
        studentIds: [...selectedIds.value],
        signFlag: 1,
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `操作失败（${body.code}）`);
    feedback.value = {
      type: "success",
      title: `${action}成功`,
      description: `已为 ${count} 名成员${action}`,
    };
    showFeedback.value = true;
    fetchList();
  } catch (e) {
    feedback.value = {
      type: "error",
      title: `${action}失败`,
      description: errorMessage(e),
    };
    showFeedback.value = true;
  } finally {
    countersigning.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    fetchList();
  }
);
</script>
