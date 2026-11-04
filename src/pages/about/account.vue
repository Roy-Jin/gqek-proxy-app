<template>
  <div class="p-4 max-w-3xl mx-auto">
    <!-- Current account -->
    <p class="mb-2 px-1 text-sm font-medium text-on-surface-variant">当前账号</p>
    <VarCard variant="filled" :elevation="false" :style="currentCardVars" class="mb-6">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <p class="min-w-0 truncate text-base font-semibold text-on-surface">{{ userNameLabel }}</p>
        </div>
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
    </VarCard>

    <!-- Saved accounts -->
    <div class="mb-2 flex items-center justify-between px-1">
      <p class="text-sm font-medium text-on-surface-variant">已保存的账号</p>
      <span v-if="savedAccounts.length" class="text-xs text-on-surface-variant">共 {{ savedAccounts.length }} 个</span>
    </div>

    <div v-if="savedAccounts.length" class="overflow-hidden rounded-lg bg-surface-container" :style="cellVars">
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
    </div>

    <VarResult v-else type="empty" :image-size="56" title="暂无已保存的账号" description="登录其他账号后，可在这里一键切换"
      :style="emptyResultVars" />

    <VarAlert v-if="switchError" type="danger" variant="tonal" :message="switchError" closeable class="mt-3"
      :style="alertVars" @close="resetError" />

    <!-- Account actions -->
    <p class="mb-2 mt-6 px-1 text-sm font-medium text-on-surface-variant">账号操作</p>
    <VarButton type="primary" tonal block @click="addAccount">
      <span class="inline-flex items-center gap-2">
        <VarIcon name="plus" :size="18" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { definePage } from "vue-router/experimental";
import {
  Alert as VarAlert,
  Button as VarButton,
  Card as VarCard,
  Cell as VarCell,
  Chip as VarChip,
  Dialog,
  Icon as VarIcon,
  Loading as VarLoading,
  Result as VarResult,
} from "@varlet/ui";
import { listTeam, logout as logoutApi } from "@/api";
import type { TeamInfo } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useToast } from "@/composables/useToast";
import { useAccountsStore } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";

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

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(true);

// Keep Varlet Cell typography/colors aligned with the app's Material tokens
const cellVars = {
  "--cell-color": "var(--md-on-surface)",
  "--cell-description-color": "var(--md-on-surface-variant)",
  "--cell-font-size": "14px",
  "--cell-padding": "14px 16px",
  "--cell-border-color": "var(--md-outline-variant)",
};

// Filled VarCard reuses the Material surface container and removes its default inner spacing
const currentCardVars = {
  "--card-padding": "16px",
  "--card-filled-background": "var(--md-surface-container)",
  "--card-border-radius": "12px",
  "--card-content-padding": "0",
  "--card-content-margin": "0",
  "--card-content-color": "var(--md-on-surface)",
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
</script>
