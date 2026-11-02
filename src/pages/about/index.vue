<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-gray-900">关于</h2>
      <p class="mt-0.5 text-sm text-gray-500">{{ env.about.subtitle }}</p>
    </div>

    <!-- Current account & team -->
    <AppCard class="mb-4">
      <div v-if="teamLoading" class="flex items-center gap-3">
        <div class="h-14 w-14 rounded-xl bg-gray-100 animate-pulse shrink-0"></div>
        <div class="space-y-2">
          <div class="h-4 w-24 rounded bg-gray-100 animate-pulse"></div>
          <div class="h-3 w-32 rounded bg-gray-100 animate-pulse"></div>
          <div class="h-3 w-28 rounded bg-gray-100 animate-pulse"></div>
        </div>
      </div>

      <div v-else class="flex items-center gap-3">
        <img
          v-if="team?.teamAvatar"
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
        <div class="min-w-0 flex-1">
          <p class="text-xs text-gray-400">当前账号</p>
          <p class="mt-0.5 text-base font-semibold text-gray-900 truncate">{{ userNameLabel }}</p>
          <p class="mt-0.5 text-xs text-gray-500 truncate">{{ teamLabel }}</p>
          <p class="mt-0.5 text-xs text-gray-500 truncate">{{ schoolLabel }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary-soft"
          @click="openAccounts"
        >
          切换
        </button>
      </div>
    </AppCard>

    <!-- App info -->
    <AppCard :padding="false" class="mb-4">
      <div class="divide-y divide-gray-100">
        <button
          type="button"
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
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
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
          @click="showDevStatement = true"
        >
          <span>{{ env.developer.statementTitle }}</span>
          <AppIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
        </button>
        <button
          v-if="debugUnlocked"
          type="button"
          class="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
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

    <!-- Developer statement dialog: hold the confirm button for 5s to unlock the debug entry -->
    <AppModal :open="showDevStatement" :title="env.developer.statementTitle" @close="showDevStatement = false">
      <p class="mt-2 text-sm text-gray-500 leading-relaxed select-none">
        {{ env.developer.statementText }}
      </p>
      <AppButton
        variant="secondary"
        block
        class="mt-4 select-none [-webkit-touch-callout:none]"
        @click="onConfirmStatement"
        @touchstart="startPress"
        @touchend="cancelPress"
        @touchcancel="cancelPress"
        @mousedown="startPress"
        @mouseup="cancelPress"
        @mouseleave="cancelPress"
        @contextmenu.prevent
      >
        知道了
      </AppButton>
    </AppModal>

    <!-- Update check dialog -->
    <AppModal :open="showUpdate" title="检查更新" @close="showUpdate = false">
      <p v-if="currentVersion" class="mt-2 text-center text-xs text-gray-400">
        当前版本 v{{ currentVersion }}
      </p>

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

    <!-- Account switch dialog -->
    <AppModal :open="showAccounts" title="切换账号" @close="closeAccounts">
      <div v-if="savedAccounts.length" class="mt-3 max-h-64 space-y-2 overflow-auto">
        <div
          v-for="account in savedAccounts"
          :key="account.userId"
          class="flex items-center gap-2 rounded-xl border p-3 transition-colors"
          :class="account.userId === currentUserId
            ? 'border-primary/40 bg-primary-soft'
            : 'border-gray-200 hover:bg-gray-50 cursor-pointer'"
          @click="onAccountClick(account.userId)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ account.userName || "未提供" }}</p>
            <p class="mt-0.5 text-xs text-gray-500 truncate">ID：{{ account.userId || "未提供" }}</p>
          </div>
          <span v-if="account.userId === currentUserId" class="shrink-0 text-[11px] text-primary">当前</span>
          <button
            v-else
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-100 disabled:opacity-50"
            :disabled="!!switchingId"
            @click.stop="removeAccount(account.userId)"
          >
            移除
          </button>
        </div>
      </div>
      <p v-else class="mt-3 text-center text-sm text-gray-500">暂无已保存的账号</p>
      <p v-if="switchError" class="mt-2 text-xs text-red-500 break-all">{{ switchError }}</p>
      <AppButton variant="secondary" block class="mt-3" @click="addAccount">
        添加 / 登录新账号
      </AppButton>
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
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { listTeam, logout as logoutApi } from "@/api";
import type { TeamInfo } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useDebugUnlock } from "@/composables/useDebugUnlock";
import { useAccountsStore } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useEnvStore } from "@/stores/env";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppModal from "@/components/ui/AppModal.vue";

const auth = useGlobal();
const env = useEnvStore();
const router = useRouter();
const toast = useToast();
const accounts = useAccountsStore();
const session = useAccountSession();
const { switchingId, errorMsg: switchError, savedAccounts, switchTo, resetError } = useAccountSwitch();

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(false);
const showDevStatement = ref(false);
const showUpdate = ref(false);
const showLogoutConfirm = ref(false);
const loggingOut = ref(false);
const showAccounts = ref(false);

const {
  state: updateState,
  currentVersion,
  release,
  error: updateError,
  hasUpdate,
  checkForUpdate,
  downloadAndInstall,
} = useAppUpdate();

const currentUserId = computed(() => auth.user?.userId || "");
const userNameLabel = computed(() => auth.user?.userName?.trim() || "未提供");
const schoolLabel = computed(() => auth.user?.schoolName?.trim() || "未提供");
const teamLabel = computed(
  () => team.value?.teamName?.trim() || auth.user?.orgName?.trim() || "未提供"
);
const teamInitial = computed(() => (team.value?.teamName ?? "").charAt(0).toUpperCase() || "团");

const { unlocked: debugUnlocked, startPress, cancelPress, shouldBlockClick } = useDebugUnlock();

// Short press only closes the dialog; the click fired by releasing a completed hold is ignored.
function onConfirmStatement() {
  if (shouldBlockClick()) return;
  showDevStatement.value = false;
}

watch(debugUnlocked, (value) => {
  if (!value) return;
  showDevStatement.value = false;
  toast.success("开发者调试已解锁");
});

// Closing the statement dialog must abort a pending hold
watch(showDevStatement, (open) => {
  if (!open) cancelPress();
});

function openAccounts() {
  resetError();
  showAccounts.value = true;
}

function closeAccounts() {
  if (switchingId.value) return;
  showAccounts.value = false;
  resetError();
}

function onAccountClick(userId: string) {
  if (userId === currentUserId.value) return;
  void switchTo(userId);
}

function removeAccount(userId: string) {
  if (userId === currentUserId.value) {
    toast.error("不能移除当前登录账号");
    return;
  }
  accounts.forget(userId);
  toast.success("已移除保存的账号");
}

function addAccount() {
  showAccounts.value = false;
  session.beginAddAccount();
}

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
    session.forgetCurrent();
    auth.logout();
    toast.success("已安全退出登录");
    router.replace("/");
  } finally {
    loggingOut.value = false;
  }
}

onMounted(() => {
  void session.refreshCurrentUser();
  void fetchTeam();
  // Silent check: only drives the red dot on the "检查更新" entry
  void checkForUpdate();
});
</script>