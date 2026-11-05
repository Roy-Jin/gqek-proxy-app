<template>
  <!-- Header action lives in the app bar but stays owned by this page -->
  <Teleport to="#app-bar-action">
    <VarButton v-if="detail" text round icon-container text-color="var(--md-on-surface)" aria-label="活动二维码" class="mr-2"
      @click="openActivityQr">
      <QrCode :size="20" />
    </VarButton>
  </Teleport>

  <div class="p-4 sm:p-6 max-w-2xl mx-auto">
    <div v-if="loading && !detail" class="flex flex-col items-center justify-center py-16 gap-4">
      <VarLoading type="circle" color="var(--md-primary)" />
      <p class="text-sm text-on-surface-variant">加载中...</p>
    </div>

    <AppErrorState v-else-if="errorMsg" :message="errorMsg" @retry="fetchDetail" />

    <template v-else-if="detail">
      <!-- Hero card: cover image with overlaid title -->
      <VarCard class="hero-card" :elevation="false">
        <template #image>
          <div class="relative h-48 w-full overflow-hidden sm:h-60">
            <img v-if="hasCover" :src="cover" :alt="detail.activityName" class="h-full w-full object-contain"
              referrerpolicy="no-referrer" @error="onImgError" />
            <div v-else class="grid h-full w-full place-items-center bg-linear-to-br from-primary to-inverse-surface">
              <Image :size="48" class="text-on-image/30" />
            </div>

            <div class="hero-scrim pointer-events-none absolute inset-0"></div>

            <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
              <div class="min-w-0">
                <h1 class="text-xl font-semibold leading-snug text-on-image line-clamp-2 sm:text-2xl">
                  {{ detail.activityName }}
                </h1>
                <!-- <p class="mt-1.5 truncate text-sm text-white/75">{{ detail.maintainerName || '—' }}</p> -->
              </div>
              <VarChip class="shrink-0" :type="statusChipType" size="small">
                {{ activityStatusLabel(detail.status) }}
              </VarChip>
            </div>
          </div>
        </template>

        <div class="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <VarChip v-if="detail.activityClassifyName" type="primary" plain size="small">
            {{ detail.activityClassifyName }}
          </VarChip>
          <span v-if="detail.processName" class="text-xs text-on-surface-variant">{{ detail.processName }}</span>
        </div>
      </VarCard>

      <!-- Member management -->
      <div class="section-title">成员管理</div>
      <VarPaper class="cell-card overflow-hidden" :elevation="0" :radius="20">
        <VarCell title="活动成员" :description="memberDescription" border :border-offset="16" ripple
          @click="showMemberManage = true">
          <template #icon>
            <span class="var-cell__icon text-on-surface-variant">
              <UsersRound :size="20" />
            </span>
          </template>
          <template #extra>
            <ChevronRight :size="20" class="text-on-surface-variant" />
          </template>
        </VarCell>
      </VarPaper>

      <!-- Sign in / out -->
      <template v-if="showSign">
        <div class="section-title">签到管理</div>
        <VarPaper class="cell-card overflow-hidden" :elevation="0" :radius="20">
          <VarCell title="签到签退" description="开启签到或签退功能" border :border-offset="16">
            <template #icon>
              <span class="var-cell__icon text-on-surface-variant">
                <UserCheck :size="20" />
              </span>
            </template>
            <template #extra>
              <VarSelect class="w-26" size="small" variant="outlined" :hint="false" :model-value="signMode"
                :options="signModeOptions" :disabled="signing" @change="onSignModeChange" />
            </template>
          </VarCell>
          <VarCell title="签到签退二维码" description="点击预览二维码，供参与者扫码" border :border-offset="16" ripple @click="openSignQr">
            <template #icon>
              <span class="var-cell__icon text-on-surface-variant">
                <QrCode :size="20" />
              </span>
            </template>
            <template #extra>
              <VarLoading v-if="qrLoading" type="circle" size="mini" />
              <ChevronRight v-else :size="20" class="text-on-surface-variant" />
            </template>
          </VarCell>
          <VarCell title="成员补签" description="为未签到、未签退的成员补签" ripple @click="showMembers = true">
            <template #icon>
              <span class="var-cell__icon text-on-surface-variant">
                <UserRoundPlus :size="20" />
              </span>
            </template>
            <template #extra>
              <ChevronRight :size="20" class="text-on-surface-variant" />
            </template>
          </VarCell>
        </VarPaper>
      </template>

      <!-- Basic info -->
      <div class="section-title">基本信息</div>
      <VarPaper class="surface-card overflow-hidden" :elevation="0" :radius="20">
        <div class="grid grid-cols-2 gap-x-4 gap-y-5 p-4 sm:p-5">
          <div v-for="item in basicInfo" :key="item.label" class="min-w-0">
            <p class="text-xs text-on-surface-variant">{{ item.label }}</p>
            <p class="mt-1.5 text-sm font-medium text-on-surface wrap-break-word">{{ item.value }}</p>
          </div>
        </div>
      </VarPaper>

      <!-- Time & location -->
      <div class="section-title">时间与地点</div>
      <VarPaper class="surface-card overflow-hidden" :elevation="0" :radius="20">
        <div class="divide-y divide-outline-variant">
          <div v-for="item in timeInfo" :key="item.label" class="flex items-start gap-3 px-4 py-4 sm:px-5">
            <component :is="item.icon" :size="20" class="mt-0.5 shrink-0 text-on-surface-variant" />
            <div class="min-w-0 flex-1">
              <p class="text-xs text-on-surface-variant">{{ item.label }}</p>
              <p class="mt-1 text-sm font-medium text-on-surface wrap-break-word" v-for="v in item.value">{{ v }}</p>
            </div>
          </div>
        </div>
      </VarPaper>

      <!-- Teachers -->
      <template v-if="teachers.length">
        <div class="section-title">指导老师</div>
        <VarPaper class="surface-card overflow-hidden" :elevation="0" :radius="20">
          <div class="divide-y divide-outline-variant">
            <div v-for="(t, i) in teachers" :key="i"
              class="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <div class="flex min-w-0 items-center gap-3">
                <GraduationCap :size="20" class="shrink-0 text-on-surface-variant" />
                <span class="truncate text-sm text-on-surface">{{ t.name }}</span>
              </div>
              <span class="shrink-0 text-xs text-on-surface-variant">{{ t.detail || '—' }}</span>
            </div>
          </div>
        </VarPaper>
      </template>

      <!-- Class hours -->
      <template v-if="classHours.length">
        <div class="section-title">学时明细</div>
        <VarPaper class="surface-card" :elevation="0" :radius="20">
          <div class="flex flex-wrap gap-2 p-4 sm:p-5">
            <VarChip v-for="(h, i) in classHours" :key="i" type="primary" plain size="small">{{ h }} 小时</VarChip>
          </div>
        </VarPaper>
      </template>

      <!-- Description -->
      <template v-if="detail.content || detail.purpose">
        <div class="section-title">活动说明</div>
        <VarPaper class="surface-card" :elevation="0" :radius="20">
          <p class="p-4 text-sm leading-relaxed text-on-surface whitespace-pre-wrap wrap-break-word sm:p-5">
            {{ detail.content || detail.purpose }}
          </p>
        </VarPaper>
      </template>
    </template>

    <MemberCountersignModal :open="showMembers" :activity-id="id" @close="showMembers = false" />
    <MemberManageModal :open="showMemberManage" :activity-id="id" :manageable="canManageMembers"
      :admin-name="detail?.studentName" :admin-phone="detail?.studentPhone" @close="showMemberManage = false"
      @changed="fetchDetail" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { definePage } from "vue-router/experimental";
import { CalendarClock, CalendarDays, ChevronRight, GraduationCap, Image, MapPin, QrCode, UserCheck, UserRoundPlus, UsersRound } from "@lucide/vue";
import {
  Button as VarButton,
  Card as VarCard,
  Cell as VarCell,
  Chip as VarChip,
  ImagePreview,
  Loading as VarLoading,
  Paper as VarPaper,
  Select as VarSelect,
} from "@varlet/ui";
import encodeQR from "qr";
import { getActivityDetail, getVolunteerActivityDetail, getSignQrCode, signFlagChange, activityStatusLabel } from "@/api";
import type { LucideIcon } from "@lucide/vue";
import type { ActivityDetail } from "@/api";
import { useToast } from "@/composables/useToast";
import { errorMessage } from "@/utils/error";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import MemberCountersignModal from "@/components/activity/MemberCountersignModal.vue";
import MemberManageModal from "@/components/activity/MemberManageModal.vue";

definePage({ meta: { title: "活动详情" } });

type ChipType = "default" | "primary" | "info" | "success" | "warning" | "danger";

interface InfoItem {
  label: string;
  value: string;
  icon?: LucideIcon;
}

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

const statusChipType = computed<ChipType>(() => {
  const status = detail.value?.status ?? 0;
  if (status === 10) return "success";
  if (status === 5) return "primary";
  if (status === 1 || status === 6 || status === 7) return "warning";
  if (status >= 2 && status <= 4) return "info";
  return "default";
});

const basicInfo = computed<InfoItem[]>(() => {
  const d = detail.value;
  if (!d) return [];
  const rows: InfoItem[] = [
    { label: "主办方", value: d.maintainerName || "—" },
  ];
  if (d.studentName) {
    rows.push({
      label: "负责人",
      value: [d.studentName, d.studentPhone].filter(Boolean).join(" · "),
    });
  }
  if (type === "volunteer" && duration.value) {
    rows.push({ label: "活动时长", value: `${duration.value} 小时` });
  }
  rows.push({
    label: "参与人数",
    value: `${d.memberNum}${limitPeople.value ? `/${limitPeople.value}` : ""} 人`,
  });
  if (d.fund) {
    rows.push({ label: "活动经费", value: `${d.fund} 元` });
  }
  return rows;
});

const timeInfo = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: "报名时间", icon: CalendarDays, value: [d.registerStartTime + " ~", d.registerEndTime] },
    { label: "活动时间", icon: CalendarClock, value: [d.activityStartTime + " ~", d.activityEndTime] },
    { label: "活动地点", icon: MapPin, value: [d.activityLocation || "—"] },
  ];
});

function onImgError() {
  imgError.value = true;
}

const signing = ref(false);
const qrLoading = ref(false);
// QR preview is only useful while at least one of sign-in / sign-out is enabled
const qrDisabled = computed(() => {
  const d = detail.value;
  if (!d) return true;
  return (d.signFlag ?? "0") !== "1" && (d.signOutFlag ?? "0") !== "1";
});
const showMembers = ref(false);
const showMemberManage = ref(false);

// Member add/remove is only allowed while the activity is between registration and completion
const canManageMembers = computed(() => {
  const status = detail.value?.status ?? 0;
  return status > 2 && status < 7;
});

const memberDescription = computed(() => {
  const count = detail.value?.memberNum ?? 0;
  return canManageMembers.value ? `共 ${count} 人，可添加或移除成员` : `共 ${count} 人`;
});

type SignMode = "off" | "sign" | "sign-out";

const signModeOptions = [
  { label: "关闭", value: "off" },
  { label: "签到", value: "sign" },
  { label: "签退", value: "sign-out" },
];

// Sign-in and sign-out are mutually exclusive, matching the backend toggle behavior
const signModeFlags: Record<SignMode, [string, string]> = {
  off: ["0", "0"],
  sign: ["1", "0"],
  "sign-out": ["0", "1"],
};

const signMode = computed<SignMode>(() => {
  const d = detail.value;
  if (d?.signFlag === "1") return "sign";
  if (d?.signOutFlag === "1") return "sign-out";
  return "off";
});
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

async function onSignModeChange(value: SignMode) {
  if (!detail.value || signing.value || value === signMode.value) return;
  const [signFlag, signOutFlag] = signModeFlags[value];
  await changeSign(signFlag, signOutFlag);
}

async function openSignQr() {
  if (qrLoading.value) return;
  if (qrDisabled.value) return toast.error("请先开启签到或签退功能");
  qrLoading.value = true;
  try {
    const body = (await getSignQrCode(id)).data;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    const url = body.data?.qrMap?.url;
    if (!url) throw new Error("暂未获取到二维码");
    ImagePreview({ images: [url], zoom: 0.8 });
  } catch (e) {
    toast.error(errorMessage(e));
  } finally {
    qrLoading.value = false;
  }
}

// Payload scanned by the native app to open this activity detail page
const ACTIVITY_QR_URL = "/pages/home/recommendation/eventDetails";

function openActivityQr() {
  const text = JSON.stringify({ businessId: id, type: 1, content: null, url: ACTIVITY_QR_URL });
  ImagePreview({ images: [encodeQR(text, "data-url", { scale: 8, border: 2 })], zoom: 0.8 });
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

<style scoped>
/* Varlet Card tuned to the app surface tokens */
.hero-card {
  --card-background: var(--md-card-surface);
  --card-border-radius: 20px;
  --card-padding: 0;
  --card-content-padding: 0;
  --card-content-margin: 0;
  --card-line-height: 1.5;
}

.surface-card {
  --paper-background: var(--md-card-surface);
}

/* Cell list inside the sign card */
.cell-card {
  --paper-background: var(--md-card-surface);
  --cell-color: var(--md-on-surface);
  --cell-description-color: var(--md-on-surface-variant);
  --cell-font-size: 14px;
  --cell-padding: 14px 16px;
  --cell-border-color: var(--md-outline-variant);
  --cell-icon-right: 12px;
  --cell-extra-left: 12px;
}

/* Scrim keeps the overlaid title readable on any cover image */
.hero-scrim {
  background-image: var(--md-image-scrim);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 10px;
  padding: 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--md-on-surface);
}

.section-title::before {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 9999px;
  background: var(--md-primary);
}
</style>
