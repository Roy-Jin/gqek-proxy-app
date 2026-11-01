<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">活动管理</h2>
        <p class="mt-0.5 text-sm text-gray-500">管理活动信息</p>
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

    <!-- Loading skeleton -->
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
      <AppEmpty text="暂无活动记录" />
    </AppCard>

    <!-- Activity list -->
    <div v-else class="space-y-3">
      <article
        v-for="item in rows"
        :key="item.activityId"
        class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer"
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

    <AppPagination
      v-if="total > 0"
      :page="pageNum"
      :total="total"
      :page-size="pageSize"
      :loading="loading"
      @change="changePage"
    />

    <p v-if="errorMsg && rows.length !== 0" class="mt-4 text-sm text-red-600">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { listMyActivityByStudent, listMyVolunteerActivityByStudent, activityStatusLabel } from "@/api";
import { useGlobal } from "@/stores/global";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppCard from "@/components/ui/AppCard.vue";
import AppEmpty from "@/components/ui/AppEmpty.vue";
import AppPagination from "@/components/ui/AppPagination.vue";

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

const auth = useGlobal();
const router = useRouter();
const pageSize = 10;
const pageNum = ref(1);
const total = ref(0);
const rows = ref<ActivityItem[]>([]);
const loading = ref(false);
const errorMsg = ref("");

const tabs = [
  { label: "志愿", value: "volunteer" },
  { label: "文体", value: "sports" },
] as const;

const activeTab = ref<ActivityTab>("volunteer");

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

let requestSeq = 0;

async function fetchList() {
  const seq = ++requestSeq;
  loading.value = true;
  errorMsg.value = "";
  try {
    if (activeTab.value === "volunteer") {
      const body = (
        await listMyVolunteerActivityByStudent({
          pageSize,
          pageNum: pageNum.value,
          type: 10,
          userId: auth.user?.userId ?? "",
        })
      ).data;
      if (seq !== requestSeq) return;
      if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
      rows.value = body.rows.map((r) => ({
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
      }));
      total.value = body.total;
    } else {
      const body = (
        await listMyActivityByStudent({ pageSize, pageNum: pageNum.value, type: 1 })
      ).data;
      if (seq !== requestSeq) return;
      if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
      rows.value = body.rows.map((r) => ({
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
      }));
      total.value = body.total;
    }
  } catch (e) {
    if (seq !== requestSeq) return;
    errorMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function switchTab(v: ActivityTab) {
  if (activeTab.value === v) return;
  activeTab.value = v;
  pageNum.value = 1;
  fetchList();
}

function changePage(p: number) {
  if (p < 1 || p > totalPages.value || p === pageNum.value) return;
  pageNum.value = p;
  fetchList();
}

function refresh() {
  fetchList();
}

function openDetail(item: ActivityItem) {
  const query = new URLSearchParams({ type: activeTab.value, id: item.activityId });
  if (item.activityAvatarUrl) query.set("cover", item.activityAvatarUrl);
  router.push(`/activity/detail?${query.toString()}`);
}

onMounted(fetchList);
</script>