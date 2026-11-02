<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-gray-900">关于</h2>
      <p class="mt-0.5 text-sm text-gray-500">应用信息与账号管理</p>
    </div>

    <!-- Team info -->
    <AppCard class="mb-4">
      <div v-if="teamLoading" class="flex items-center gap-3">
        <div class="h-14 w-14 rounded-xl bg-gray-100 animate-pulse shrink-0"></div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-100 rounded w-32 animate-pulse"></div>
          <div class="h-3 bg-gray-100 rounded w-20 animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="team" class="flex items-center gap-3">
        <img
          v-if="team.teamAvatar"
          :src="team.teamAvatar"
          :alt="team.teamName"
          class="h-14 w-14 rounded-xl object-cover shrink-0"
        />
        <div
          v-else
          class="h-14 w-14 rounded-xl bg-primary-soft text-primary-fg grid place-items-center text-lg font-semibold shrink-0"
        >
          {{ teamInitial }}
        </div>
        <div class="min-w-0">
          <p class="text-xs text-gray-400">团队</p>
          <p class="mt-0.5 text-base font-semibold text-gray-900 truncate">{{ team.teamName }}</p>
          <p v-if="schoolName" class="mt-0.5 text-xs text-gray-500 truncate">{{ schoolName }}</p>
        </div>
      </div>

      <div v-else>
        <p class="text-xs text-gray-400">团队</p>
        <p class="mt-1 text-base font-semibold text-gray-900">{{ schoolName || '暂无团队信息' }}</p>
      </div>
    </AppCard>

    <!-- App info -->
    <AppCard :padding="false" class="mb-4">
      <div class="divide-y divide-gray-100">
        <button
          type="button"
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          @click="openUpdate"
        >
          <span class="flex items-center gap-2">
            检查更新
            <span v-if="hasUpdate" class="h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          <AppIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
        </button>
        <button
          type="button"
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          @click="showDevStatement = true"
        >
          <span>开发者声明</span>
          <AppIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
        </button>
        <button
          type="button"
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          @click="goDebug"
        >
          <span>开发者调试</span>
          <AppIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </AppCard>

    <AppButton variant="danger" block @click="showLogoutConfirm = true">
      退出登录
    </AppButton>

    <!-- Developer statement dialog -->
    <AppModal :open="showDevStatement" title="开发者声明" @close="showDevStatement = false">
      <p class="mt-2 text-sm text-gray-500 leading-relaxed">
        本系统面向组织负责人内部使用，未经授权请勿外传；该软件仅供学习交流使用，如有任何侵权行为，请联系作者（QQ 724011786）删除。
      </p>
      <AppButton variant="secondary" block class="mt-4" @click="showDevStatement = false">
        知道了
      </AppButton>
    </AppModal>

    <!-- Update check dialog -->
    <AppModal :open="showUpdate" title="检查更新" @close="showUpdate = false">
      <!-- Checking -->
      <div v-if="updateState === 'checking'" class="mt-2 flex items-center justify-center gap-2 py-4">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-primary"></span>
        <p class="text-sm text-gray-500">正在检查更新...</p>
      </div>

      <!-- Error -->
      <template v-else-if="updateState === 'error'">
        <p class="mt-2 text-sm text-gray-500 leading-relaxed break-all">{{ updateError }}</p>
        <AppButton variant="primary" block class="mt-4" @click="checkForUpdate">
          重试
        </AppButton>
      </template>

      <!-- Up to date -->
      <template v-else-if="updateState === 'up-to-date'">
        <p class="mt-2 text-sm text-gray-500 leading-relaxed">
          当前已是最新版本 v{{ currentVersion }}
        </p>
        <AppButton variant="secondary" block class="mt-4" @click="checkForUpdate">
          重新检查
        </AppButton>
      </template>

      <!-- New version available -->
      <template v-else-if="release">
        <p class="mt-2 text-sm text-gray-500 leading-relaxed">
          发现新版本 v{{ release.version }}（当前 v{{ currentVersion }}）
          <template v-if="release.apkSize">，约 {{ formatSize(release.apkSize) }}</template>
        </p>
        <div
          v-if="release.notes"
          class="mt-2 max-h-32 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-wrap"
        >{{ release.notes }}</div>
        <AppButton
          variant="primary"
          block
          class="mt-4"
          @click="downloadAndInstall"
        >
          立即下载安装
        </AppButton>
      </template>
    </AppModal>

    <!-- Logout confirmation dialog -->
    <AppModal :open="showLogoutConfirm" title="退出登录" @close="showLogoutConfirm = false">
      <p class="mt-2 text-sm text-gray-500 text-center">确定要退出当前账号吗？</p>
      <div class="mt-4 flex gap-2">
        <AppButton variant="secondary" class="flex-1" @click="showLogoutConfirm = false">
          取消
        </AppButton>
        <AppButton variant="danger" class="flex-1" :loading="loggingOut" @click="logout">
          退出
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { listTeam, logout as logoutApi } from "@/api";
import type { TeamInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { useAppUpdate } from "@/composables/useAppUpdate";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppModal from "@/components/ui/AppModal.vue";

const auth = useGlobal();
const router = useRouter();
const toast = useToast();

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(false);
const showDevStatement = ref(false);
const showUpdate = ref(false);
const showLogoutConfirm = ref(false);
const loggingOut = ref(false);

const {
  state: updateState,
  currentVersion,
  release,
  error: updateError,
  hasUpdate,
  checkForUpdate,
  downloadAndInstall,
} = useAppUpdate();

const schoolName = auth.user?.schoolName || "";
const teamInitial = computed(() => (team.value?.teamName ?? "").charAt(0).toUpperCase() || "团");

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function fetchTeam() {
  teamLoading.value = true;
  try {
    const body = (await listTeam({ pageSize: 10, pageNum: 1 })).data;
    if (body.code !== 200) throw new Error(body.msg || `请求失败（${body.code}）`);
    team.value = body.rows[0] ?? null;
  } catch {
    team.value = null;
  } finally {
    teamLoading.value = false;
  }
}

function goDebug() {
  router.push("/about/debug");
}

function openUpdate() {
  showUpdate.value = true;
  void checkForUpdate();
}

async function logout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    // Best-effort server-side invalidation; local state is always cleared.
    try {
      await logoutApi();
    } catch {
      /* ignore network/server errors during logout */
    }
    auth.logout();
    toast.success("已安全退出登录");
    router.replace("/");
  } finally {
    loggingOut.value = false;
  }
}

onMounted(() => {
  void fetchTeam();
  // Silent check: only drives the red dot on the "检查更新" entry
  void checkForUpdate();
});
</script>