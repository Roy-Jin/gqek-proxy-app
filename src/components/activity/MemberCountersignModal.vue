<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
        @click.self="emit('close')"
      >
        <div class="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
            <p class="text-base font-semibold text-gray-900">成员补签</p>
            <button
              type="button"
              class="-mr-1 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              @click="emit('close')"
            >
              <AppIcon name="x" class="h-5 w-5" />
            </button>
          </div>

          <!-- Filters -->
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
            <select
              v-model="signFlag"
              class="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              @change="fetchList"
            >
              <option value="">全部</option>
              <option value="3">签到签退</option>
              <option value="1">签到</option>
              <option value="2">签退</option>
              <option value="0">暂无</option>
            </select>
            <div class="relative min-w-0 flex-1">
              <AppIcon
                name="search"
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
              <input
                v-model="keyword"
                type="text"
                placeholder="按姓名/账号搜索，回车查询"
                class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                @keyup.enter="fetchList"
              />
            </div>
          </div>

          <!-- Member list -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="loading && members.length === 0" class="divide-y divide-gray-100">
              <AppSkeletonRows />
            </div>

            <ul v-else-if="members.length > 0" class="divide-y divide-gray-100">
              <li
                v-for="m in members"
                :key="m.studentId"
                class="flex cursor-pointer gap-3 px-4 py-3.5 transition-colors sm:px-5"
                :class="selectedIds.includes(m.studentId) ? 'bg-primary-soft' : 'hover:bg-gray-50'"
                @click="toggleSelect(m.studentId)"
              >
                <label class="mt-0.5 shrink-0 cursor-pointer select-none" @click.stop>
                  <input
                    type="checkbox"
                    class="sr-only"
                    :checked="selectedIds.includes(m.studentId)"
                    @change="toggleSelect(m.studentId)"
                  />
                  <AppCheckCircle :checked="selectedIds.includes(m.studentId)" />
                </label>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="truncate text-sm font-medium text-gray-900">{{ m.studentName || '—' }}</p>
                    <span class="shrink-0 text-xs text-gray-400">{{ m.userName || '' }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-gray-500">{{ m.collegeName }} · {{ m.className }}</p>
                  <p class="mt-0.5 text-xs text-gray-400">签到 {{ m.signNum }} 次 · 签退 {{ m.signOutNum }} 次</p>
                </div>
              </li>
            </ul>

            <AppEmpty v-else-if="!loading" text="暂无成员数据" />
          </div>

          <p v-if="errorMsg" class="border-t border-gray-100 px-4 py-2 text-sm text-red-600 sm:px-5">
            {{ errorMsg }}
          </p>

          <!-- Action bar -->
          <div v-if="selectedIds.length > 0" class="flex items-center gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
            <button type="button" class="flex select-none items-center gap-1.5 text-sm text-gray-600" @click="toggleSelectAll">
              <AppCheckCircle :checked="allSelected" />
              全选
            </button>
            <span class="text-sm text-gray-500">已选 <span class="font-semibold text-primary-fg">{{ selectedIds.length }}</span> 人</span>
            <span class="flex-1"></span>
            <AppButton variant="secondary" size="sm" @click="clearSelection">取消</AppButton>
            <AppButton variant="primary" size="sm" :loading="countersigning" @click="doCountersign('0')">补签到</AppButton>
            <AppButton variant="danger" size="sm" :loading="countersigning" @click="doCountersign('1')">补签退</AppButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { listActivityMembers, countersign } from "@/api";
import type { MemberInfo } from "@/api";
import { useToast } from "@/composables/useToast";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { errorMessage } from "@/utils/error";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppCheckCircle from "@/components/ui/AppCheckCircle.vue";
import AppSkeletonRows from "@/components/ui/AppSkeletonRows.vue";

const props = defineProps<{ open: boolean; activityId: string }>();
const emit = defineEmits<{ close: [] }>();

const toast = useToast();

const members = ref<MemberInfo[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const keyword = ref("");
const signFlag = ref("");
const countersigning = ref(false);

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(members, (member) => member.studentId);

let requestSeq = 0;

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
