<template>
  <VarPopup :show="open" position="bottom" :default-style="false" safe-area @update:show="onUpdateShow"
    @close="emit('close')">
    <div
      class="app-card flex h-[88vh] w-full flex-col overflow-hidden rounded-t-xl sm:mx-auto sm:max-w-lg sm:rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 sm:px-5">
        <p class="text-base font-semibold text-on-surface">{{ mode === "add" ? "添加成员" : "成员管理" }}</p>
        <div class="flex shrink-0 items-center gap-1">
          <VarButton v-if="manageable && mode === 'list'" text type="primary" size="small" @click="startAdd">
            添加成员
          </VarButton>
          <VarButton v-if="mode === 'add'" text size="small" text-color="var(--md-on-surface-variant)"
            @click="backToList">
            返回列表
          </VarButton>
          <VarButton icon-container text round size="small" text-color="var(--md-on-surface-variant)" aria-label="关闭"
            @click="emit('close')">
            <X :size="20" />
          </VarButton>
        </div>
      </div>

      <!-- Member list -->
      <template v-if="mode === 'list'">
        <div class="border-b border-outline-variant px-4 py-3 sm:px-5">
          <VarInput v-model="keyword" variant="outlined" size="small" clearable placeholder="搜索姓名/学号/学院/班级"
            class="w-full">
            <template #prepend-icon>
              <Search :size="18" />
            </template>
          </VarInput>
        </div>

        <div class="flex-1 overflow-y-auto">
          <VarSkeleton v-if="loading && members.length === 0" :loading="true" title :rows="6" class="p-4" />

          <ul v-else-if="filteredMembers.length > 0" class="divide-y divide-outline-variant">
            <li v-for="m in filteredMembers" :key="m.studentId" class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="truncate text-sm font-medium text-on-surface">{{ m.studentName || '—' }}
                    <VarChip v-if="isAdmin(m)" type="primary" plain size="small" class="ml-1">管理员</VarChip>
                  </p>
                  <span class="shrink-0 text-xs text-on-surface-variant">{{ m.userName || '' }}</span>
                </div>
                <p class="mt-0.5 truncate text-xs text-on-surface-variant">
                  {{ [m.collegeName, m.className].filter(Boolean).join(' · ') || '—' }}
                </p>
              </div>
              <VarButton v-if="manageable && !isAdmin(m)" icon-container text round size="small" type="danger"
                aria-label="移除成员" @click="askRemove(m)">
                <Trash2 :size="18" />
              </VarButton>
            </li>
          </ul>

          <AppEmpty v-else-if="!loading" :text="keyword.trim() ? '没有符合条件的成员' : '暂无成员数据'" />
        </div>
      </template>

      <!-- Add member: search students, then add the selected ones -->
      <template v-else>
        <div class="flex items-center gap-2 border-b border-outline-variant px-4 py-3 sm:px-5">
          <VarInput v-model="searchKeyword" variant="outlined" size="small" clearable placeholder="输入姓名或学号"
            class="min-w-0 flex-1">
            <template #prepend-icon>
              <Search :size="18" />
            </template>
          </VarInput>
          <VarButton type="primary" :loading="searching" @click="searchUsers">搜索</VarButton>
        </div>

        <div class="flex-1 overflow-y-auto">
          <ul v-if="addableUsers.length > 0" class="divide-y divide-outline-variant">
            <li v-for="u in addableUsers" :key="u.userId" v-ripple
              class="relative flex cursor-pointer gap-3 overflow-hidden px-4 py-3.5 sm:px-5"
              :class="selectedIds.includes(u.userId) ? 'bg-primary-container' : ''" @click="toggleSelect(u.userId)">
              <VarCheckbox :model-value="selectedIds.includes(u.userId)" class="mt-0.5 shrink-0" @click.stop
                @change="toggleSelect(u.userId)" />
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <p class="truncate text-sm font-medium text-on-surface">{{ u.nickName || '—' }}</p>
                  <span class="shrink-0 text-xs text-on-surface-variant">{{ u.userName || '' }}</span>
                </div>
                <p class="mt-0.5 truncate text-xs text-on-surface-variant">
                  ID：{{ u.userId || '—' }}
                </p>
              </div>
            </li>
          </ul>

          <AppEmpty v-else-if="!searching" :text="searched ? '没有找到匹配的用户' : '输入姓名或学号后搜索'" />
        </div>

        <div v-if="selectedIds.length > 0"
          class="flex items-center gap-3 border-t border-outline-variant px-4 py-3 sm:px-5">
          <VarCheckbox :model-value="allSelected" class="select-none text-sm" @change="toggleSelectAll">
            全选
          </VarCheckbox>
          <span class="text-sm text-on-surface-variant">已选 <span class="font-semibold text-primary">{{
            selectedIds.length }}</span> 人</span>
          <span class="flex-1"></span>
          <VarButton type="primary" :loading="adding" @click="doAdd">添加</VarButton>
        </div>
      </template>

      <p v-if="errorMsg" class="border-t border-outline-variant px-4 py-2 text-sm text-error sm:px-5">
        {{ errorMsg }}
      </p>
    </div>
  </VarPopup>

  <!-- Remove confirmation -->
  <VarDialog v-model:show="showRemoveConfirm" title="移除成员" message-align="center" width="86vw"
    :dialog-style="{ maxWidth: '20rem' }" close-on-click-overlay>
    <p class="text-sm text-on-surface-variant">
      确定将「{{ pendingRemove?.studentName || '该成员' }}」移出活动吗？
    </p>
    <template #actions>
      <div class="flex w-full gap-2 px-6 pb-6">
        <VarButton class="flex-1" type="primary" tonal @click="showRemoveConfirm = false">取消</VarButton>
        <VarButton class="flex-1" type="danger" :loading="removing" @click="doRemove">确认移除</VarButton>
      </div>
    </template>
  </VarDialog>

  <!-- Result feedback for add / remove -->
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
import { Search, Trash2, X } from "@lucide/vue";
import {
  Button as VarButton,
  Checkbox as VarCheckbox,
  Chip as VarChip,
  Dialog,
  Input as VarInput,
  Popup as VarPopup,
  Result as VarResult,
  Skeleton as VarSkeleton,
  Ripple,
} from "@varlet/ui";
import {
  deleteActivityMember,
  insertActivityMembers,
  listActivityMembers,
  searchStudents,
} from "@/api";
import type { MemberInfo, StudentUser } from "@/api";
import { useMultiSelect } from "@/composables/useMultiSelect";
import { useToast } from "@/composables/useToast";
import { useEnvStore } from "@/stores/env";
import { useGlobal } from "@/stores/global";
import { errorMessage } from "@/utils/error";
import AppEmpty from "@/components/ui/AppEmpty.vue";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;
const vRipple = Ripple;

const props = defineProps<{
  open: boolean;
  activityId: string;
  manageable: boolean;
  /** Activity leader displayed on the detail page; never removable */
  adminName?: string | null;
  adminPhone?: string | null;
}>();
const emit = defineEmits<{ close: []; changed: [] }>();

const toast = useToast();
const env = useEnvStore();
const auth = useGlobal();

const mode = ref<"list" | "add">("list");
const members = ref<MemberInfo[]>([]);
const loading = ref(false);
const errorMsg = ref("");
const keyword = ref("");

const searchKeyword = ref("");
const searchResults = ref<StudentUser[]>([]);
const searching = ref(false);
const searched = ref(false);
const adding = ref(false);

const removing = ref(false);
const showRemoveConfirm = ref(false);
const pendingRemove = ref<MemberInfo | null>(null);

const showFeedback = ref(false);
const feedback = ref<{ type: "success" | "error"; title: string; description: string } | null>(null);

// Student search is school-scoped; fall back to the login default when /getInfo has no schoolId
const schoolId = computed(() => auth.user?.schoolId || env.auth.defaultSchoolId);

const filteredMembers = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) return members.value;
  return members.value.filter((member) =>
    [member.studentName, member.userName, member.studentId, member.collegeName, member.majorName, member.className]
      .some((value) => (value ?? "").toLowerCase().includes(query))
  );
});

// Users already in the activity cannot be added again
const addableUsers = computed(() => {
  const existing = new Set(members.value.map((member) => member.studentId));
  return searchResults.value.filter((user) => !existing.has(user.userId));
});

const { selectedIds, allSelected, toggle: toggleSelect, toggleAll: toggleSelectAll, clear: clearSelection } =
  useMultiSelect(addableUsers, (user) => user.userId);

watch(searchResults, clearSelection);

function onUpdateShow(value: boolean) {
  if (!value) emit("close");
}

// The activity leader must never be removed; match by phone first, then by name
function isAdmin(member: MemberInfo): boolean {
  const adminName = props.adminName?.trim();
  const adminPhone = props.adminPhone?.trim();
  const memberPhone = member.phone?.trim();
  if (adminPhone && memberPhone) return adminPhone === memberPhone;
  return !!adminName && (member.studentName || "").trim() === adminName;
}

async function fetchMembers() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const body = (
      await listActivityMembers({
        activityId: props.activityId,
        // Keep server-side filters empty; filtering is handled locally
        signFlag: "",
        userName: "",
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    members.value = body.rows;
  } catch (e) {
    errorMsg.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function startAdd() {
  mode.value = "add";
  searchKeyword.value = "";
  searchResults.value = [];
  searched.value = false;
  errorMsg.value = "";
}

function backToList() {
  mode.value = "list";
  errorMsg.value = "";
}

async function searchUsers() {
  const query = searchKeyword.value.trim();
  if (!query) return toast.error("请输入姓名或学号");
  searching.value = true;
  searched.value = true;
  try {
    const body = (
      await searchStudents({ schoolId: schoolId.value, nameOrNo: query, userType: 1 })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `搜索失败（${body.code}）`);
    searchResults.value = body.data ?? [];
  } catch (e) {
    searchResults.value = [];
    toast.error(errorMessage(e));
  } finally {
    searching.value = false;
  }
}

async function doAdd() {
  if (selectedIds.value.length === 0 || adding.value) return;
  const users = addableUsers.value.filter((user) => selectedIds.value.includes(user.userId));
  if (users.length === 0) return;
  adding.value = true;
  try {
    const body = (
      await insertActivityMembers({
        activityId: props.activityId,
        list: users.map((user) => ({ nickName: user.nickName || user.userName, userId: user.userId })),
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `添加失败（${body.code}）`);
    feedback.value = {
      type: "success",
      title: "添加成功",
      description: `已添加 ${users.length} 名成员`,
    };
    showFeedback.value = true;
    backToList();
    emit("changed");
    fetchMembers();
  } catch (e) {
    feedback.value = { type: "error", title: "添加失败", description: errorMessage(e) };
    showFeedback.value = true;
  } finally {
    adding.value = false;
  }
}

function askRemove(member: MemberInfo) {
  if (isAdmin(member)) return toast.error("不可以移除活动管理员");
  pendingRemove.value = member;
  showRemoveConfirm.value = true;
}

async function doRemove() {
  const member = pendingRemove.value;
  if (!member || removing.value) return;
  if (isAdmin(member)) {
    showRemoveConfirm.value = false;
    pendingRemove.value = null;
    return toast.error("不可以移除活动管理员");
  }
  removing.value = true;
  try {
    const body = (await deleteActivityMember(props.activityId, member.studentId)).data;
    if (body.code !== 200) throw new Error(body.msg || `移除失败（${body.code}）`);
    feedback.value = {
      type: "success",
      title: "移除成功",
      description: `已将「${member.studentName || "该成员"}」移出活动`,
    };
    showFeedback.value = true;
    showRemoveConfirm.value = false;
    pendingRemove.value = null;
    emit("changed");
    fetchMembers();
  } catch (e) {
    feedback.value = { type: "error", title: "移除失败", description: errorMessage(e) };
    showFeedback.value = true;
  } finally {
    removing.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    mode.value = "list";
    keyword.value = "";
    searchKeyword.value = "";
    searchResults.value = [];
    searched.value = false;
    errorMsg.value = "";
    showFeedback.value = false;
    feedback.value = null;
    fetchMembers();
  }
);
</script>
