<template>
  <VarPopup
    :show="open"
    position="bottom"
    :default-style="false"
    safe-area
    @update:show="onUpdateShow"
    @close="emit('close')"
  >
    <div class="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface-container sm:mx-auto sm:max-w-lg sm:rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 sm:px-5">
        <p class="text-base font-semibold text-on-surface">成员补签</p>
        <VarButton
          icon-container
          text
          round
          size="small"
          text-color="var(--md-on-surface-variant)"
          aria-label="关闭"
          @click="emit('close')"
        >
          <VarIcon name="window-close" :size="20" />
        </VarButton>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2 border-b border-outline-variant px-4 py-3 sm:px-5">
        <VarSelect
          v-model="signFlag"
          variant="outlined"
          size="small"  
          placeholder="未筛选"
          :options="signFlagOptions"
          :hint="false"
          class="w-28 shrink-0"
          @change="fetchList"
        />
        <VarInput
          v-model="keyword"
          variant="outlined"
          size="small"
          clearable
          placeholder="按姓名搜索，回车查询"
          class="min-w-0 flex-1"
          @keyup.enter="fetchList"
        >
          <template #prepend-icon>
            <VarIcon name="magnify" :size="18" />
          </template>
        </VarInput>
      </div>

      <!-- Member list -->
      <div class="flex-1 overflow-y-auto">
        <VarSkeleton
          v-if="loading && members.length === 0"
          :loading="true"
          title
          :rows="6"
          class="p-4"
        />

        <ul v-else-if="members.length > 0" class="divide-y divide-outline-variant">
          <li
            v-for="m in members"
            :key="m.studentId"
            v-ripple
            class="relative flex cursor-pointer gap-3 overflow-hidden px-4 py-3.5 sm:px-5"
            :class="selectedIds.includes(m.studentId) ? 'bg-primary-container' : ''"
            @click="toggleSelect(m.studentId)"
          >
            <VarCheckbox
              :model-value="selectedIds.includes(m.studentId)"
              class="mt-0.5 shrink-0"
              @click.stop
              @change="toggleSelect(m.studentId)"
            />
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

        <AppEmpty v-else-if="!loading" text="暂无成员数据" />
      </div>

      <p v-if="errorMsg" class="border-t border-outline-variant px-4 py-2 text-sm text-error sm:px-5">
        {{ errorMsg }}
      </p>

      <!-- Action bar -->
      <div v-if="selectedIds.length > 0" class="flex items-center gap-2 border-t border-outline-variant px-4 py-3 sm:px-5">
        <button type="button" class="flex select-none items-center gap-1.5 text-sm text-on-surface-variant" @click="toggleSelectAll">
          <VarCheckbox :model-value="allSelected" @click.stop @change="toggleSelectAll" />
          全选
        </button>
        <span class="text-sm text-on-surface-variant">已选 <span class="font-semibold text-primary">{{ selectedIds.length }}</span> 人</span>
        <span class="flex-1"></span>
        <VarButton type="primary" tonal size="small" @click="clearSelection">取消</VarButton>
        <VarButton type="primary" size="small" :loading="countersigning" @click="doCountersign('0')">补签到</VarButton>
        <VarButton type="danger" size="small" :loading="countersigning" @click="doCountersign('1')">补签退</VarButton>
      </div>
    </div>
  </VarPopup>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Button as VarButton,
  Checkbox as VarCheckbox,
  Icon as VarIcon,
  Input as VarInput,
  Popup as VarPopup,
  Select as VarSelect,
  Skeleton as VarSkeleton,
  Ripple,
} from "@varlet/ui";
import { listActivityMembers, countersign } from "@/api";
import type { MemberInfo } from "@/api";
import { useToast } from "@/composables/useToast";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";

const vRipple = Ripple;

const props = defineProps<{ open: boolean; activityId: string }>();
const emit = defineEmits<{ close: [] }>();

const toast = useToast();

const members = ref<MemberInfo[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const keyword = ref("");
const signFlag = ref("");
const countersigning = ref(false);

const signFlagOptions = [
  { label: "未筛选", value: "" },
  { label: "已完成", value: "3" },
  { label: "仅签到", value: "1" },
  { label: "仅签退", value: "2" },
  { label: "未打卡", value: "0" },
];

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(members, (member) => member.studentId);

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
        signFlag: signFlag.value,
        userName: keyword.value,
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
    toast.success("操作成功");
    fetchList();
  } catch (e) {
    toast.error(errorMessage(e));
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
