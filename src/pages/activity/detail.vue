<template>
  <div class="p-4 sm:p-6 max-w-2xl mx-auto">
    <div v-if="loading && !detail" class="flex flex-col items-center justify-center py-16 gap-4">
      <VarLoading type="circle" color="var(--md-primary)" />
      <p class="text-sm text-on-surface-variant">加载中...</p>
    </div>

    <AppErrorState v-else-if="errorMsg" :message="errorMsg" @retry="fetchDetail" />

    <template v-else-if="detail">
      <!-- Cover -->
      <div class="rounded-2xl overflow-hidden bg-primary-container w-40 sm:w-56 mx-auto">
        <img v-if="hasCover" :src="cover" :alt="detail.activityName" class="w-full aspect-square object-cover"
          referrerpolicy="no-referrer" @error="onImgError" />
        <div v-else class="w-full aspect-square grid place-items-center text-on-primary-container">
          <VarIcon name="image-outline" :size="32" class="opacity-60" />
        </div>
      </div>

      <!-- Title header -->
      <div class="bg-surface-container rounded-lg p-4 mt-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-base font-semibold text-on-surface">{{ detail.activityName }}</h3>
          <span class="shrink-0 px-2 py-0.5 text-xs rounded bg-surface-high text-on-surface-variant">{{
            activityStatusLabel(detail.status) }}</span>
        </div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 text-xs rounded-md bg-primary-container text-on-primary-container">{{
            detail.activityClassifyName }}</span>
          <span v-if="detail.processName" class="text-xs text-on-surface-variant">{{ detail.processName }}</span>
        </div>
      </div>

      <!-- Sign in / out -->
      <div v-if="showSign" class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">签到管理</p>
        <div class="flex items-center justify-between py-2">
          <span class="text-sm text-on-surface">签到</span>
          <VarSwitch variant :model-value="detail.signFlag === '1'" :disabled="signing" @change="toggleSign" />
        </div>
        <div class="flex items-center justify-between py-2 border-t border-outline-variant">
          <span class="text-sm text-on-surface">签退</span>
          <VarSwitch variant :model-value="detail.signOutFlag === '1'" :disabled="signing" @change="toggleSignOut" />
        </div>
        <button type="button" v-ripple
          class="w-full flex items-center justify-between py-2.5 border-t border-outline-variant text-sm text-on-surface transition-colors"
          @click="showMembers = true">
          <span>成员补签</span>
          <VarIcon name="chevron-right" :size="16" class="text-on-surface-variant" />
        </button>
      </div>

      <!-- Basic info -->
      <div class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">基本信息</p>
        <dl class="space-y-3 text-sm">
          <div class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">主办方</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ detail.maintainerName || '—' }}</dd>
          </div>
          <div v-if="detail.studentName" class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">负责人</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">
              {{ detail.studentName }}<template v-if="detail.studentPhone"> · {{ detail.studentPhone }}</template>
            </dd>
          </div>
          <div v-if="type === 'volunteer' && duration" class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">活动时长</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ duration }} 小时</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">参与人数</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">
              {{ detail.memberNum }}<template v-if="limitPeople">/{{ limitPeople }}</template> 人
            </dd>
          </div>
          <div v-if="detail.fund" class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">活动经费</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ detail.fund }} 元</dd>
          </div>
        </dl>
      </div>

      <!-- Time & location -->
      <div class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">时间与地点</p>
        <dl class="space-y-3 text-sm">
          <div class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">活动时间</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ detail.activityStartTime }} ~ {{
              detail.activityEndTime
              }}</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">报名时间</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ detail.registerStartTime }} ~ {{
              detail.registerEndTime
              }}</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-on-surface-variant">活动地点</dt>
            <dd class="flex-1 min-w-0 text-on-surface text-right">{{ detail.activityLocation || '—' }}</dd>
          </div>
        </dl>
      </div>

      <!-- Teachers -->
      <div v-if="teachers.length" class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">指导老师</p>
        <ul class="space-y-2">
          <li v-for="(t, i) in teachers" :key="i"
            class="text-sm text-on-surface flex items-center justify-between gap-2">
            <span>{{ t.name }}</span>
            <span class="text-on-surface-variant text-xs shrink-0">{{ t.detail }}</span>
          </li>
        </ul>
      </div>

      <!-- Class hours -->
      <div v-if="classHours.length" class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">学时明细</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="(h, i) in classHours" :key="i"
            class="px-2.5 py-1 text-xs rounded-lg bg-surface-high text-on-surface">{{ h }} 小时</span>
        </div>
      </div>

      <!-- Description -->
      <div v-if="detail.content || detail.purpose" class="bg-surface-container rounded-lg p-4 mt-4">
        <p class="text-sm font-semibold text-on-surface mb-3">活动说明</p>
        <p class="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-all">
          {{ detail.content || detail.purpose }}
        </p>
      </div>
    </template>

    <MemberCountersignModal :open="showMembers" :activity-id="id" @close="showMembers = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { definePage } from "vue-router/experimental";
import { Icon as VarIcon, Loading as VarLoading, Switch as VarSwitch, Ripple as vRipple } from "@varlet/ui";
import { getActivityDetail, getVolunteerActivityDetail, signFlagChange, activityStatusLabel } from "@/api";
import type { ActivityDetail } from "@/api";
import { useToast } from "@/composables/useToast";
import { errorMessage } from "@/utils/error";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import MemberCountersignModal from "@/components/activity/MemberCountersignModal.vue";

definePage({ meta: { title: "活动详情" } });

const route = useRoute();
const toast = useToast();

const type = (route.query.type as string) || "volunteer";
const id = (route.query.id as string) || "";

const detail = ref<ActivityDetail | null>(null);
const loading = ref(false);
const errorMsg = ref("");
const imgError = ref(false);

const listCover = (route.query.cover as string) || "";
const cover = computed(() => detail.value?.activityAvatarImg || detail.value?.activityAvatarUrl || listCover);
const hasCover = computed(() => !!(cover.value && !imgError.value));
const duration = computed(() => detail.value?.serviceTime || detail.value?.attendTime || "");
const limitPeople = computed(() => detail.value?.activitiyLimitInfoVo?.limitPeople ?? null);

function onImgError() {
  imgError.value = true;
}

const signing = ref(false);
const showMembers = ref(false);
const started = computed(() => {
  const t = detail.value?.activityStartTime;
  if (!t) return false;
  const time = new Date(t.replace(" ", "T")).getTime();
  return !Number.isNaN(time) && Date.now() >= time;
});

const showSign = computed(() => started.value && (detail.value?.status ?? 0) <= 7);

async function changeSign(signFlag: string, signOutFlag: string) {
  if (!detail.value) return;
  signing.value = true;
  try {
    const body = (await signFlagChange({ activityId: id, signFlag, signOutFlag })).data;
    if (body.code !== 200) throw new Error(body.msg || `操作失败（${body.code}）`);
    detail.value.signFlag = signFlag;
    detail.value.signOutFlag = signOutFlag;
    toast.success("操作成功");
  } catch (e) {
    toast.error(errorMessage(e));
  } finally {
    signing.value = false;
  }
}

function toggleSign() {
  if (!detail.value) return;
  const next = detail.value.signFlag === "1" ? "0" : "1";
  changeSign(next, next === "1" ? "0" : (detail.value.signOutFlag ?? "0"));
}

function toggleSignOut() {
  if (!detail.value) return;
  const next = detail.value.signOutFlag === "1" ? "0" : "1";
  changeSign(next === "1" ? "0" : (detail.value.signFlag ?? "0"), next);
}

const teachers = computed(() =>
  (detail.value?.activitiyTeacherVoList || []).flatMap((t) => {
    const detailParts = [t.instructTime ? `${t.instructTime}小时` : "", t.instructLabel || ""].filter(Boolean);
    return [{
      name: t.teacherName || "—",
      detail: detailParts.join(" · "),
    }];
  }).filter((t) => t.name !== "—")
);

const classHours = computed(() =>
  (detail.value?.activitiyClassHourList || [])
    .map((c) => c.attendTime)
    .filter((n): n is string => !!n)
);

async function fetchDetail() {
  if (!id) {
    errorMsg.value = "缺少活动 ID";
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  imgError.value = false;
  try {
    const body =
      type === "volunteer"
        ? (await getVolunteerActivityDetail(id)).data
        : (await getActivityDetail(id)).data;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    detail.value = body.data;
  } catch (e) {
    errorMsg.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDetail);
</script>
