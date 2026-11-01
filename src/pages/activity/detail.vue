<template>
  <div class="p-4 sm:p-6 max-w-2xl mx-auto">
    <div class="flex items-center gap-2 mb-4">
      <button
        type="button"
        class="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-500 rounded-lg transition-colors hover:bg-gray-100"
        @click="back"
      >
        <AppIcon name="chevron-right" class="h-4 w-4 rotate-180" />
        返回
      </button>
      <h2 class="text-lg font-semibold text-gray-900">活动详情</h2>
    </div>

    <AppSpinner v-if="loading && !detail" text="加载中..." />

    <AppCard v-else-if="errorMsg" class="text-center">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <p class="text-sm">{{ errorMsg }}</p>
        <AppButton variant="secondary" size="sm" @click="fetchDetail">
          <AppIcon name="refresh" class="h-4 w-4" />
          重试
        </AppButton>
      </div>
    </AppCard>

    <template v-else-if="detail">
      <!-- Cover -->
      <div class="rounded-2xl overflow-hidden bg-primary-soft w-40 sm:w-56 mx-auto">
        <img
          v-if="hasCover"
          :src="cover"
          :alt="detail.activityName"
          class="w-full aspect-square object-cover"
          referrerpolicy="no-referrer"
          @error="onImgError"
        />
        <div v-else class="w-full aspect-square grid place-items-center text-gray-300">
          <AppIcon name="inbox" class="h-8 w-8 opacity-60" />
        </div>
      </div>

      <!-- Title header -->
      <AppCard class="mt-4">
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-base font-semibold text-gray-900">{{ detail.activityName }}</h3>
          <span class="shrink-0 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-500">{{ activityStatusLabel(detail.status) }}</span>
        </div>
        <div class="mt-2 flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 text-xs rounded-md bg-primary-soft text-primary-fg">{{ detail.activityClassifyName }}</span>
          <span v-if="detail.processName" class="text-xs text-gray-400">{{ detail.processName }}</span>
        </div>
      </AppCard>

      <!-- Sign in / out -->
      <AppCard v-if="showSign" class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">签到管理</p>
        <div class="flex items-center justify-between py-2">
          <span class="text-sm text-gray-700">签到</span>
          <button
            type="button"
            class="relative h-6 w-11 rounded-full transition-colors disabled:opacity-40"
            :class="detail.signFlag === '1' ? 'bg-primary' : 'bg-gray-200'"
            :disabled="signing"
            @click="toggleSign"
          >
            <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="detail.signFlag === '1' ? 'translate-x-5' : ''"></span>
          </button>
        </div>
        <div class="flex items-center justify-between py-2 border-t border-gray-100">
          <span class="text-sm text-gray-700">签退</span>
          <button
            type="button"
            class="relative h-6 w-11 rounded-full transition-colors disabled:opacity-40"
            :class="detail.signOutFlag === '1' ? 'bg-primary' : 'bg-gray-200'"
            :disabled="signing"
            @click="toggleSignOut"
          >
            <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="detail.signOutFlag === '1' ? 'translate-x-5' : ''"></span>
          </button>
        </div>
      </AppCard>

      <!-- Basic info -->
      <AppCard class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">基本信息</p>
        <dl class="space-y-3 text-sm">
          <div class="flex">
            <dt class="w-24 shrink-0 text-gray-400">主办方</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ detail.maintainerName || '—' }}</dd>
          </div>
          <div v-if="detail.studentName" class="flex">
            <dt class="w-24 shrink-0 text-gray-400">负责人</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">
              {{ detail.studentName }}<template v-if="detail.studentPhone"> · {{ detail.studentPhone }}</template>
            </dd>
          </div>
          <div v-if="type === 'volunteer' && duration" class="flex">
            <dt class="w-24 shrink-0 text-gray-400">活动时长</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ duration }} 小时</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-gray-400">参与人数</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">
              {{ detail.memberNum }}<template v-if="limitPeople">/{{ limitPeople }}</template> 人
            </dd>
          </div>
          <div v-if="detail.fund" class="flex">
            <dt class="w-24 shrink-0 text-gray-400">活动经费</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ detail.fund }} 元</dd>
          </div>
        </dl>
      </AppCard>

      <!-- Time & location -->
      <AppCard class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">时间与地点</p>
        <dl class="space-y-3 text-sm">
          <div class="flex">
            <dt class="w-24 shrink-0 text-gray-400">活动时间</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ detail.activityStartTime }} ~ {{ detail.activityEndTime }}</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-gray-400">报名时间</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ detail.registerStartTime }} ~ {{ detail.registerEndTime }}</dd>
          </div>
          <div class="flex">
            <dt class="w-24 shrink-0 text-gray-400">活动地点</dt>
            <dd class="flex-1 min-w-0 text-gray-700 text-right">{{ detail.activityLocation || '—' }}</dd>
          </div>
        </dl>
      </AppCard>

      <!-- Teachers -->
      <AppCard v-if="teachers.length" class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">指导老师</p>
        <ul class="space-y-2">
          <li v-for="(t, i) in teachers" :key="i" class="text-sm text-gray-700 flex items-center justify-between gap-2">
            <span>{{ t.name }}</span>
            <span class="text-gray-400 text-xs shrink-0">{{ t.detail }}</span>
          </li>
        </ul>
      </AppCard>

      <!-- Class hours -->
      <AppCard v-if="classHours.length" class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">学时明细</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(h, i) in classHours"
            :key="i"
            class="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700"
          >{{ h }} 小时</span>
        </div>
      </AppCard>

      <!-- Description -->
      <AppCard v-if="detail.content || detail.purpose" class="mt-4">
        <p class="text-sm font-semibold text-gray-900 mb-3">活动说明</p>
        <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-all">
          {{ detail.content || detail.purpose }}
        </p>
      </AppCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getActivityDetail, getVolunteerActivityDetail, signFlagChange, activityStatusLabel } from "@/api";
import type { ActivityDetail } from "@/api";
import { useToast } from "@/composables/useToast";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppSpinner from "@/components/ui/AppSpinner.vue";

const route = useRoute();
const router = useRouter();
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
    toast.error(e instanceof Error ? e.message : String(e));
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

function back() {
  router.back();
}

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
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchDetail);
</script>