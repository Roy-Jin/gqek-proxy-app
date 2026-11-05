<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 class="text-[22px] leading-7 font-medium text-on-surface">活动</h2>
        <p class="mt-1 text-sm text-on-surface-variant">本组织主办的活动</p>
      </div>
      <VarButton text type="primary" size="small" :loading="loading" @click="refresh">
        <RefreshCw :size="16" class="mr-1" />
        刷新
      </VarButton>
    </div>

    <!-- Tabs -->
    <AppSegmented :items="tabs" :active="activeTab" block @change="switchTab" />

    <!-- Loading skeleton (first load) -->
    <div v-if="loading && rows.length === 0" class="mt-3 space-y-3">
      <VarPaper v-for="i in 5" :key="i" class="flex items-center gap-3 p-3" :elevation="0" :radius="16">
        <div class="w-20 h-20 rounded-md bg-surface-high shrink-0 animate-pulse"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 rounded bg-surface-high w-3/4 animate-pulse"></div>
          <div class="h-3 rounded bg-surface-high w-1/2 animate-pulse"></div>
          <div class="h-3 rounded bg-surface-high w-2/3 animate-pulse"></div>
        </div>
      </VarPaper>
    </div>

    <!-- Error state (first load) -->
    <AppErrorState v-else-if="errorMsg && rows.length === 0" class="mt-3" :message="errorMsg" @retry="refresh" />

    <!-- Activity list: VarList pulls the next batch when the detector reaches the end -->
    <VarList v-else v-model:loading="loadingMore" :finished="noMore" :error="!!errorMsg" loading-text="加载中..."
      :offset="80" class="mt-3" @load="loadMore">
      <div class="space-y-3">
        <VarPaper v-for="item in rows" :key="item.activityId" :elevation="0" :radius="16" ripple
          class="p-3" @click="openDetail(item)">
          <div class="flex items-center gap-3">
            <div class="flex flex-col items-center gap-1.5 shrink-0 w-20">
              <div class="w-full aspect-square rounded-md overflow-hidden bg-surface-high">
                <img v-if="item.activityAvatarUrl" :src="item.activityAvatarUrl" :alt="item.activityName"
                  class="w-full h-full object-cover" loading="lazy" />
                <div v-else class="w-full h-full grid place-items-center text-on-surface-variant">
                  <Image :size="24" />
                </div>
              </div>
              <span
                class="rounded-full bg-surface-high px-2.5 py-1 text-[11px] text-on-surface-variant whitespace-nowrap">
                {{ activityStatusLabel(item.status) }}
              </span>
            </div>

            <div class="flex-1 min-w-0 flex flex-col">
              <h3 class="text-[15px] font-semibold text-on-surface truncate">{{ item.activityName }}</h3>
              <p class="mt-1 text-xs text-on-surface-variant truncate">{{ item.maintainerName }}</p>
              <span
                class="mt-1.5 inline-flex w-fit items-center rounded-sm bg-primary-container px-2 py-0.5 text-xs font-medium text-on-primary-container">
                {{ item.activityClassifyName }}
              </span>

              <div class="mt-auto pt-2 space-y-1 text-xs text-on-surface-variant">
                <div class="flex items-center gap-1">
                  <CalendarDays :size="14" class="shrink-0" />
                  <span class="truncate">{{ item.activityStartTime }}</span>
                </div>
              </div>

              <div class="mt-2 flex items-center gap-3 text-xs text-on-surface-variant">
                <span class="inline-flex items-center gap-1">
                  <Clock :size="14" />
                  {{ item.duration || '—' }} 小时
                </span>
                <span class="inline-flex items-center gap-1">
                  <CircleUser :size="14" />
                  {{ item.memberNum }} 人
                </span>
              </div>
            </div>
          </div>
        </VarPaper>
      </div>

      <template #finished>
        <VarPaper v-if="rows.length === 0" :elevation="0" :radius="16">
          <AppEmpty text="暂无本组织活动记录" />
        </VarPaper>
        <p v-else class="py-4 text-center text-sm text-on-surface-variant">数据都被你榨干了…</p>
      </template>

      <template #error>
        <p class="py-4 text-center text-sm text-error">{{ errorMsg }}</p>
      </template>
    </VarList>

    <!-- TODO: wire activity actions (create activity, etc.) into this fab later -->
    <VarFab class="fab-inverse" :bottom="84" :right="16">
      <template #trigger>
        <VarButton var-fab-cover class="var-fab__trigger" icon-container>
          <Plus :size="24" />
        </VarButton>
      </template>
    </VarFab>

    <!-- Scroll target is the app shell's <main>, not the window -->
    <VarBackTop target="main" :visibility-height="320" :right="16" :bottom="152" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CalendarDays, CircleUser, Clock, Image, Plus, RefreshCw } from "@lucide/vue";
import {
  BackTop as VarBackTop,
  Button as VarButton,
  Fab as VarFab,
  List as VarList,
  Paper as VarPaper,
} from "@varlet/ui";
import { listMyActivityByStudent, listMyVolunteerActivityByStudent, activityStatusLabel } from "@/api";
import type { ActivityInfo, VolunteerActivityInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import { errorMessage } from "@/utils/error";
import AppSegmented from "@/components/ui/AppSegmented.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

type ActivityTab = "volunteer" | "sports";

interface ActivityItem {
  activityId: string;
  activityName: string;
  activityAvatarUrl: string | null;
  maintainerName: string;
  teacherName: string | null;
  activityClassifyName: string;
  activityLocation: string;
  duration: string;
  memberNum: number;
  status: number;
  activityStartTime: string;
  activityEndTime: string;
}

const PAGE_SIZE = 10;
/** Pull one extra page when a batch yields fewer own-org rows than this. */
const MIN_BATCH_ITEMS = 3;

const auth = useGlobal();
const router = useRouter();
const route = useRoute();

const tabs = [
  { label: "志愿", value: "volunteer" },
  { label: "文体", value: "sports" },
] as const;

/** Tab comes from the URL so a refresh or deep link never trusts stale state. */
function parseTab(value: unknown): ActivityTab {
  return value === "sports" ? "sports" : "volunteer";
}

const activeTab = ref<ActivityTab>(parseTab(route.query.tab));
const rows = ref<ActivityItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
const errorMsg = ref("");

let serverPage = 1;
let orgMaintainerIds = new Set<string>();
let seenIds = new Set<string>();
let requestSeq = 0;

function durationOf(tab: ActivityTab, r: ActivityInfo | VolunteerActivityInfo): string {
  if (tab === "volunteer") {
    return (r as VolunteerActivityInfo).serviceTime ?? r.attendTime ?? "";
  }
  return r.attendTime ?? "";
}

function toItem(tab: ActivityTab, r: ActivityInfo | VolunteerActivityInfo): ActivityItem {
  return {
    activityId: r.activityId,
    activityName: r.activityName,
    activityAvatarUrl: r.activityAvatarUrl,
    maintainerName: r.maintainerName,
    teacherName: r.teacherName,
    activityClassifyName: r.activityClassifyName,
    activityLocation: r.activityLocation,
    duration: durationOf(tab, r),
    memberNum: r.memberNum,
    status: r.status,
    activityStartTime: r.activityStartTime,
    activityEndTime: r.activityEndTime,
  };
}

/**
 * Org anchor: maintainerId of rows the current user created. type=1 includes
 * own-created activities, so no extra type=10 request is needed.
 */
function collectAnchors(list: Array<ActivityInfo | VolunteerActivityInfo>) {
  const userId = String(auth.user?.userId ?? "");
  if (!userId) return;
  for (const r of list) {
    if (String(r.createBy ?? "") === userId && r.maintainerId) {
      orgMaintainerIds.add(String(r.maintainerId));
    }
  }
}

/** Dedup by activityId, keep rows whose maintainerId belongs to the anchor set. */
function selectOrgRows(
  tab: ActivityTab,
  list: Array<ActivityInfo | VolunteerActivityInfo>
): ActivityItem[] {
  const batchIds = new Set<string>();
  const items: ActivityItem[] = [];
  for (const r of list) {
    const id = String(r.activityId);
    if (batchIds.has(id) || seenIds.has(id)) continue;
    batchIds.add(id);
    if (!r.maintainerId || !orgMaintainerIds.has(String(r.maintainerId))) continue;
    items.push(toItem(tab, r));
  }
  return items;
}

async function requestType1(tab: ActivityTab, page: number) {
  return (
    tab === "volunteer"
      ? await listMyVolunteerActivityByStudent({
        pageSize: PAGE_SIZE,
        pageNum: page,
        type: 1,
        userId: auth.user?.userId ?? "",
      })
      : await listMyActivityByStudent({
        pageSize: PAGE_SIZE,
        pageNum: page,
        type: 1,
      })
  ).data;
}

/**
 * Load one batch of PAGE_SIZE rows. When the batch yields fewer than
 * MIN_BATCH_ITEMS own-org rows, one extra page is pulled and merged.
 * The top-up happens at most once per batch and never recurses.
 */
async function fetchBatch(tab: ActivityTab, seq: number) {
  const collected: Array<ActivityInfo | VolunteerActivityInfo> = [];

  async function pullPage(): Promise<boolean> {
    const body = await requestType1(tab, serverPage);
    if (seq !== requestSeq) return false;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    serverPage++;
    if (body.rows.length < PAGE_SIZE) noMore.value = true;
    collected.push(...body.rows);
    return true;
  }

  if (!(await pullPage())) return;
  collectAnchors(collected);
  let items = selectOrgRows(tab, collected);

  if (items.length < MIN_BATCH_ITEMS && !noMore.value) {
    if (!(await pullPage())) return;
    collectAnchors(collected);
    items = selectOrgRows(tab, collected);
  }

  for (const item of items) {
    seenIds.add(item.activityId);
    rows.value.push(item);
  }
}

/** Reset tab state and render the first batch; no throttle involved. */
async function initTab() {
  const seq = ++requestSeq;
  const tab = activeTab.value;
  loading.value = true;
  loadingMore.value = false;
  errorMsg.value = "";
  noMore.value = false;
  serverPage = 1;
  orgMaintainerIds = new Set();
  seenIds = new Set();
  rows.value = [];
  try {
    await fetchBatch(tab, seq);
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = errorMessage(e);
  } finally {
    if (seq === requestSeq) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

async function loadMore() {
  // First page still loading: keep VarList paused; initTab clears the flag when done.
  if (loading.value) return;
  if (noMore.value) {
    loadingMore.value = false;
    return;
  }
  const seq = requestSeq;
  const tab = activeTab.value;
  try {
    await fetchBatch(tab, seq);
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = errorMessage(e);
  } finally {
    if (seq === requestSeq) loadingMore.value = false;
  }
}

function switchTab(v: ActivityTab) {
  if (activeTab.value === v) return;
  activeTab.value = v;
  // Keep the URL in sync so returning from a detail page restores this tab.
  router.replace({ path: route.path, query: { ...route.query, tab: v } });
  initTab();
}

function refresh() {
  if (loading.value) return;
  initTab();
}

function openDetail(item: ActivityItem) {
  const query = new URLSearchParams({ type: activeTab.value, id: item.activityId });
  if (item.activityAvatarUrl) query.set("cover", item.activityAvatarUrl);
  router.push(`/activity/detail?${query.toString()}`);
}

onMounted(initTab);
</script>
