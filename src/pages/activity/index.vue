<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">活动管理</h2>
        <p class="mt-0.5 text-sm text-gray-500">本组织主办的活动</p>
      </div>
      <AppButton variant="secondary" size="sm" :loading="loading" @click="refresh">
        <AppIcon name="refresh" class="h-4 w-4" />
        刷新
      </AppButton>
    </div>

    <!-- Tabs -->
    <div class="flex p-1 rounded-xl bg-gray-100 w-fit mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="px-4 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap"
        :class="activeTab === tab.value ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Loading skeleton (first load) -->
    <div v-if="loading && rows.length === 0" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 animate-pulse"
      >
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-200 shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          <div class="h-3 bg-gray-100 rounded w-1/2"></div>
          <div class="h-3 bg-gray-100 rounded w-2/3"></div>
        </div>
      </div>
    </div>

    <!-- Error state (first load) -->
    <AppCard v-else-if="errorMsg && rows.length === 0" class="text-center">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <p class="text-sm">{{ errorMsg }}</p>
        <AppButton variant="secondary" size="sm" @click="refresh">
          <AppIcon name="refresh" class="h-4 w-4" />
          重试
        </AppButton>
      </div>
    </AppCard>

    <!-- Empty state -->
    <AppCard v-else-if="rows.length === 0">
      <AppEmpty text="暂无本组织活动记录" />
    </AppCard>

    <!-- Activity list -->
    <div v-else class="space-y-3">
      <article
        v-for="item in rows"
        :key="item.activityId"
        class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200/70 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:bg-gray-50 cursor-pointer"
        @click="openDetail(item)"
      >
        <div class="flex flex-col items-center gap-1.5 shrink-0 w-20 sm:w-24">
          <div class="w-full aspect-square rounded-xl overflow-hidden bg-gray-100">
            <img
              v-if="item.activityAvatarUrl"
              :src="item.activityAvatarUrl"
              :alt="item.activityName"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full grid place-items-center text-gray-300">
              <AppIcon name="inbox" class="h-6 w-6" />
            </div>
          </div>
          <span class="px-1.5 py-0.5 text-[10px] leading-none rounded bg-gray-100 text-gray-500 whitespace-nowrap">
            {{ activityStatusLabel(item.status) }}
          </span>
        </div>

        <div class="flex-1 min-w-0 flex flex-col">
          <h3 class="text-sm font-semibold text-gray-900 truncate">{{ item.activityName }}</h3>
          <p class="mt-1 text-xs text-gray-500 truncate">{{ item.maintainerName }}</p>
          <span
            class="inline-block w-fit mt-1.5 px-2 py-0.5 text-[11px] leading-none rounded-md bg-primary-soft text-primary-fg"
          >
            {{ item.activityClassifyName }}
          </span>

          <div class="mt-auto pt-1.5 space-y-1 text-xs text-gray-500">
            <div class="flex items-center gap-1">
              <AppIcon name="calendar" class="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span class="truncate">{{ item.activityStartTime }} ~ {{ item.activityEndTime }}</span>
            </div>
            <div class="flex items-center gap-1">
              <AppIcon name="pin" class="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span class="truncate">{{ item.activityLocation || '待定' }}</span>
            </div>
          </div>

          <div class="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
            <span class="inline-flex items-center gap-1">
              <AppIcon name="users" class="h-3.5 w-3.5" />
              {{ item.memberNum }} 人
            </span>
            <span class="inline-flex items-center gap-1">
              <AppIcon name="clock" class="h-3.5 w-3.5" />
              {{ item.duration || '—' }} 小时
            </span>
          </div>
        </div>
      </article>
    </div>

    <!-- Manual load more: available for both empty and non-empty lists -->
    <div v-if="!loading && !(errorMsg && rows.length === 0)" class="py-3 text-center">
      <AppButton
        v-if="!noMore"
        variant="secondary"
        size="sm"
        :loading="loadingMore"
        @click="loadMore"
      >
        <AppIcon name="refresh" class="h-4 w-4" />
        加载更多
      </AppButton>
      <span v-else-if="rows.length > 0" class="text-sm text-gray-400">没有更多了</span>
    </div>

    <p v-if="errorMsg && rows.length !== 0" class="mt-4 text-sm text-red-600">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { listMyActivityByStudent, listMyVolunteerActivityByStudent, activityStatusLabel } from "@/api";
import type { ActivityInfo, VolunteerActivityInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppCard from "@/components/ui/AppCard.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";

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

const tabs = [
  { label: "志愿", value: "volunteer" },
  { label: "文体", value: "sports" },
] as const;

const activeTab = ref<ActivityTab>("volunteer");
const rows = ref<ActivityItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
const errorMsg = ref("");

let serverPage = 1;
let orgMaintainerIds = new Set<string>();
let seenIds = new Set<string>();
let requestSeq = 0;

function mapVolunteer(r: VolunteerActivityInfo): ActivityItem {
  return {
    activityId: r.activityId,
    activityName: r.activityName,
    activityAvatarUrl: r.activityAvatarUrl,
    maintainerName: r.maintainerName,
    teacherName: r.teacherName,
    activityClassifyName: r.activityClassifyName,
    activityLocation: r.activityLocation,
    duration: r.serviceTime ?? r.attendTime ?? "",
    memberNum: r.memberNum,
    status: r.status,
    activityStartTime: r.activityStartTime,
    activityEndTime: r.activityEndTime,
  };
}

function mapSports(r: ActivityInfo): ActivityItem {
  return {
    activityId: r.activityId,
    activityName: r.activityName,
    activityAvatarUrl: r.activityAvatarUrl,
    maintainerName: r.maintainerName,
    teacherName: r.teacherName,
    activityClassifyName: r.activityClassifyName,
    activityLocation: r.activityLocation,
    duration: r.attendTime,
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
    items.push(
      tab === "volunteer"
        ? mapVolunteer(r as VolunteerActivityInfo)
        : mapSports(r as ActivityInfo)
    );
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
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || noMore.value) return;
  const seq = requestSeq;
  const tab = activeTab.value;
  loadingMore.value = true;
  try {
    await fetchBatch(tab, seq);
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (seq === requestSeq) loadingMore.value = false;
  }
}

function switchTab(v: ActivityTab) {
  if (activeTab.value === v) return;
  activeTab.value = v;
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
