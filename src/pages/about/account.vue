<template>
  <VarPullRefresh v-model="refreshing" class="p-4 max-w-3xl mx-auto" target="main" @refresh="onPullRefresh">
    <!-- Current account -->
    <p class="mb-2 px-1 text-sm font-medium text-on-surface-variant">当前账号</p>
    <VarPaper :elevation="0" :radius="16" class="mb-6 p-4">
      <div class="flex items-center gap-3">
        <img v-if="team?.teamAvatar" :src="team.teamAvatar" :alt="team.teamName"
          class="h-14 w-14 rounded-md object-cover shrink-0" />
        <div v-else
          class="h-14 w-14 rounded-md bg-primary-container text-on-primary-container grid place-items-center text-lg font-semibold shrink-0">
          {{ teamInitial }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="min-w-0 truncate text-base font-semibold text-on-surface">{{ userNameLabel }}</p>
          <div class="mt-1 flex items-center gap-1.5">
            <p class="min-w-0 truncate text-sm" :class="team ? 'text-on-surface' : 'text-on-surface-variant'">
              {{ teamLoading ? "团队信息加载中..." : teamNameLabel }}
            </p>
            <VarChip v-if="!teamLoading && teamRole" plain size="mini" :type="isTeamLeader ? 'primary' : 'info'"
              class="shrink-0 whitespace-nowrap">
              {{ teamRole }}
            </VarChip>
          </div>
          <p class="mt-0.5 truncate text-xs text-on-surface-variant">{{ schoolLabel }}</p>
          <p class="mt-1 truncate text-xs text-on-surface-variant">ID：{{ currentUserId || "未提供" }}</p>
        </div>
      </div>
    </VarPaper>

    <!-- Saved accounts -->
    <div class="mb-2 flex items-center justify-between px-1">
      <p class="text-sm font-medium text-on-surface-variant">已保存的账号</p>
      <span v-if="savedAccounts.length" class="text-xs text-on-surface-variant">共 {{ savedAccounts.length }} 个</span>
    </div>

    <VarPaper v-if="savedAccounts.length" class="overflow-hidden" :elevation="0" :radius="16" :style="cellVars">
      <VarCell v-for="(account, index) in savedAccounts" :key="account.userId" :title="account.userName || '未提供'"
        :description="'ID：' + (account.userId || '未提供')" ripple extra-class="shrink-0"
        :border="index < savedAccounts.length - 1" :border-offset="16" @click="onAccountClick(account.userId)">
        <template #extra>
          <VarChip v-if="account.userId === currentUserId" type="primary" plain size="mini"
            class="shrink-0 whitespace-nowrap">
            当前
          </VarChip>
          <VarLoading v-else-if="switchingId === account.userId" type="circle" size="mini" color="var(--md-primary)" />
          <VarButton v-else text type="danger" size="small" :disabled="!!switchingId"
            @click.stop="removeAccount(account.userId)">
            移除
          </VarButton>
        </template>
      </VarCell>
    </VarPaper>

    <VarResult v-else type="empty" :image-size="56" title="暂无已保存的账号" description="登录其他账号后，可在这里一键切换"
      :style="emptyResultVars" />

    <VarAlert v-if="switchError" type="danger" variant="tonal" :message="switchError" closeable class="mt-3"
      :style="alertVars" @close="resetError" />

    <!-- Temp key: only shown for accounts signed in with password -->
    <template v-if="canCreateTempKey">
      <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">临时密钥</p>
      <VarPaper class="p-4" :elevation="0" :radius="16">
        <p class="text-xs leading-relaxed text-on-surface-variant">
          临时密钥在 {{ tempKeyMinutes }} 分钟内登录后方可长期使用
        </p>
        <VarButton type="primary" tonal block class="mt-3" @click="createShareKey">
          生成临时密钥
        </VarButton>
        <template v-if="tempKey">
          <p class="mt-3 select-all break-all rounded-md bg-surface-high p-3 font-mono text-xs text-on-surface-variant">{{ tempKey }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">该密钥有效期至 {{ tempKeyExpiry }}</p>
        </template>
      </VarPaper>
    </template>

    <!-- Account actions -->
    <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">账号操作</p>
    <VarButton type="primary" tonal block @click="addAccount">
      <span class="inline-flex items-center gap-2">
        <Plus :size="18" />
        添加 / 登录新账号
      </span>
    </VarButton>
    <VarButton class="mt-3" type="danger" text block @click="showLogoutConfirm = true">
      退出登录
    </VarButton>

    <!-- Logout confirmation dialog -->
    <VarDialog v-model:show="showLogoutConfirm" title="退出登录" message="退出后需要重新登录才能继续使用，确定要退出当前账号吗？" width="86vw"
      :dialog-style="{ maxWidth: '20rem' }" cancel-button-text="取消" confirm-button-text="退出"
      :confirm-button-props="{ type: 'danger' }" close-on-click-overlay @confirm="logout" />
  </VarPullRefresh>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { definePage } from "vue-router/experimental";
import {
  Alert as VarAlert,
  Button as VarButton,
  Cell as VarCell,
  Chip as VarChip,
  Dialog,
  Loading as VarLoading,
  Paper as VarPaper,
  PullRefresh as VarPullRefresh,
  Result as VarResult,
} from "@varlet/ui";
import { listTeam, logout as logoutApi } from "@/api";
import type { TeamInfo } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useToast } from "@/composables/useToast";
import { useAccountsStore } from "@/stores/accounts";
import { Plus } from "@lucide/vue";
import { useGlobal } from "@/stores/global";
import { copyText } from "@/utils/clipboard";
import { createTempKey, TEMP_KEY_TTL_MS } from "@/utils/tempKey";

definePage({ meta: { title: "账号相关" } });

const VarDialog = Dialog.Component;

const auth = useGlobal();
const router = useRouter();
const toast = useToast();
const accounts = useAccountsStore();
const session = useAccountSession();
const { switchingId, errorMsg: switchError, savedAccounts, switchTo, resetError } = useAccountSwitch();

const showLogoutConfirm = ref(false);
const loggingOut = ref(false);

const tempKey = ref("");
const tempKeyExpiry = ref("");
const tempKeyMinutes = Math.round(TEMP_KEY_TTL_MS / 60000);
const canCreateTempKey = computed(() => auth.loginMethod === "account");

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(true);
const refreshing = ref(false);

// Keep Varlet Cell typography/colors aligned with the app's Material tokens
const cellVars = {
  "--cell-color": "var(--md-on-surface)",
  "--cell-description-color": "var(--md-on-surface-variant)",
  "--cell-font-size": "14px",
  "--cell-padding": "14px 16px",
  "--cell-border-color": "var(--md-outline-variant)",
};

// Varlet Result ships light-only colors; align the empty state with Material tokens
const emptyResultVars = {
  "--result-background": "var(--md-surface-container)",
  "--result-border-radius": "12px",
  "--result-padding": "28px 16px",
  "--result-title-font-size": "15px",
  "--result-title-font-weight": "500",
  "--result-title-color": "var(--md-on-surface)",
  "--result-title-margin": "12px 0 0 0",
  "--result-description-font-size": "13px",
  "--result-description-color": "var(--md-on-surface-variant)",
  "--result-empty-color": "var(--md-on-surface-variant)",
  "--result-empty-border-color": "var(--md-outline-variant)",
};

const alertVars = {
  "--alert-border-radius": "12px",
};

const currentUserId = computed(() => auth.user?.userId || "");
const userNameLabel = computed(() => auth.user?.userName?.trim() || "未提供");
const schoolLabel = computed(() => auth.user?.schoolName?.trim() || "未提供");
const teamNameLabel = computed(
  () => team.value?.teamName?.trim() || auth.user?.orgName?.trim() || "未加入团队"
);
const isTeamLeader = computed(() => Number(team.value?.memberFlag) === 1);
const teamRole = computed(() => (team.value ? (isTeamLeader.value ? "队长" : "队员") : ""));
const teamInitial = computed(() => (team.value?.teamName ?? "").charAt(0).toUpperCase() || "LOGO");

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
  resetError();
  session.beginAddAccount();
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function createShareKey() {
  if (!canCreateTempKey.value || !auth.token) {
    toast.error("仅账号密码登录的账号可生成临时密钥");
    return;
  }
  const { key, expiresAt } = createTempKey(auth.token);
  tempKey.value = key;
  tempKeyExpiry.value = formatExpiry(expiresAt);
  if (await copyText(key)) {
    toast.success(`临时密钥已复制，有效期至 ${tempKeyExpiry.value}`);
  } else {
    toast.error("复制失败，请手动复制下方密钥");
  }
}

/** Bind the current account to its team; the role comes from memberFlag. */
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
});

/** Pull-to-refresh updates the profile and team card together. */
async function onPullRefresh() {
  await Promise.all([session.refreshCurrentUser(), fetchTeam()]);
  refreshing.value = false;
}
</script>
