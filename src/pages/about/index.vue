<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="mb-4">
      <h2 class="text-[22px] leading-7 font-medium text-on-surface">关于</h2>
      <p class="mt-1 text-sm text-on-surface-variant">{{ env.about.subtitle }}</p>
    </div>

    <!-- Current account & team -->
    <div class="mb-4 bg-surface-container rounded-lg p-4">
      <div v-if="teamLoading" class="flex items-center gap-3">
        <div class="h-14 w-14 rounded-md bg-surface-high animate-pulse shrink-0"></div>
        <div class="space-y-2">
          <div class="h-4 w-24 rounded bg-surface-high animate-pulse"></div>
          <div class="h-3 w-32 rounded bg-surface-high animate-pulse"></div>
          <div class="h-3 w-28 rounded bg-surface-high animate-pulse"></div>
        </div>
      </div>

      <div v-else class="flex items-center gap-3">
        <img v-if="team?.teamAvatar" :src="team.teamAvatar" :alt="team.teamName"
          class="h-14 w-14 rounded-md object-cover shrink-0" />
        <div v-else
          class="h-14 w-14 rounded-md bg-primary-container text-on-primary-container grid place-items-center text-lg font-semibold shrink-0">
          {{ teamInitial }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs text-on-surface-variant">当前账号</p>
          <p class="mt-0.5 text-base font-semibold text-on-surface truncate">{{ userNameLabel }}</p>
          <p class="mt-0.5 text-xs text-on-surface-variant truncate">{{ teamLabel }}</p>
          <p class="mt-0.5 text-xs text-on-surface-variant truncate">{{ schoolLabel }}</p>
        </div>
        <VarButton text type="primary" size="small" @click="openAccounts">切换</VarButton>
      </div>
    </div>

    <!-- Entries: project info & settings -->
    <div class="overflow-hidden rounded-lg bg-surface-container" :style="cellVars">
      <VarCell :title="env.developer.statementTitle" icon="file-document-outline" icon-class="text-on-surface-variant"
        ripple border :border-offset="16" @click="showDevStatement = true">
        <template #extra>
          <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
        </template>
      </VarCell>
      <VarCell title="设置" icon="cog-outline" icon-class="text-on-surface-variant" ripple border :border-offset="16"
        @click="goSettings">
        <template #extra>
          <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
        </template>
      </VarCell>
      <VarCell title="关于项目" icon="information-outline" icon-class="text-on-surface-variant" ripple @click="goProject">
        <template #extra>
          <div class="flex items-center gap-2">
            <span v-if="hasUpdate" class="h-2 w-2 rounded-full bg-error">
              <span class="sr-only">有新版本</span>
            </span>
            <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
          </div>
        </template>
      </VarCell>
    </div>

    <VarButton class="mt-4" type="danger" block @click="showLogoutConfirm = true">
      退出登录
    </VarButton>

    <!-- Developer statement dialog: hold the confirm button for 5s to unlock the debug entry -->
    <VarDialog v-model:show="showDevStatement" :title="env.developer.statementTitle" width="86vw"
      :dialog-style="{ maxWidth: '20rem' }" close-on-click-overlay>
      <p class="text-sm text-on-surface-variant leading-relaxed select-none">
        {{ env.developer.statementText }}
      </p>
      <template #actions>
        <div class="w-full px-6 pb-6">
          <VarButton type="primary" tonal block class="select-none [-webkit-touch-callout:none]"
            @click="onConfirmStatement" @touchstart="startPress" @touchend="cancelPress" @touchcancel="cancelPress"
            @mousedown="startPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent>
            知道了
          </VarButton>
        </div>
      </template>
    </VarDialog>

    <!-- Account switch dialog -->
    <VarDialog :show="showAccounts" title="切换账号" width="86vw" :dialog-style="{ maxWidth: '20rem' }"
      close-on-click-overlay @update:show="onAccountsUpdateShow">
      <div v-if="savedAccounts.length" class="max-h-64 space-y-2 overflow-auto">
        <div v-for="account in savedAccounts" :key="account.userId"
          v-ripple="{ disabled: account.userId === currentUserId }"
          class="flex items-center gap-2 rounded-md border p-3" :class="account.userId === currentUserId
            ? 'border-primary bg-primary-container'
            : 'border-outline-variant cursor-pointer'" @click="onAccountClick(account.userId)">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-on-surface truncate">{{ account.userName || "未提供" }}</p>
            <p class="mt-0.5 text-xs text-on-surface-variant truncate">ID：{{ account.userId || "未提供" }}</p>
          </div>
          <span v-if="account.userId === currentUserId" class="shrink-0 text-[11px] text-primary">当前</span>
          <VarButton v-else text type="primary" size="small" :disabled="!!switchingId"
            @click.stop="removeAccount(account.userId)">
            移除
          </VarButton>
        </div>
      </div>
      <p v-else class="text-center text-sm text-on-surface-variant">暂无已保存的账号</p>
      <p v-if="switchError" class="mt-2 text-xs text-error break-all">{{ switchError }}</p>
      <template #actions>
        <div class="w-full px-6 pb-6">
          <VarButton type="primary" tonal block @click="addAccount">
            添加 / 登录新账号
          </VarButton>
        </div>
      </template>
    </VarDialog>

    <!-- Logout confirmation dialog -->
    <VarDialog v-model:show="showLogoutConfirm" title="退出登录" message-align="center" width="86vw"
      :dialog-style="{ maxWidth: '20rem' }" close-on-click-overlay>
      <p class="text-sm text-on-surface-variant">确定要退出当前账号吗？</p>
      <template #actions>
        <div class="flex w-full gap-2 px-6 pb-6">
          <VarButton class="flex-1" type="primary" tonal @click="showLogoutConfirm = false">
            取消
          </VarButton>
          <VarButton class="flex-1" type="danger" :loading="loggingOut" @click="logout">
            退出
          </VarButton>
        </div>
      </template>
    </VarDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Button as VarButton,
  Cell as VarCell,
  Dialog,
  Icon as VarIcon,
  Ripple as vRipple,
} from "@varlet/ui";
import { listTeam, logout as logoutApi } from "@/api";
import type { TeamInfo } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useDebugUnlock } from "@/composables/useDebugUnlock";
import { useAccountsStore } from "@/stores/accounts";
import { useEnvStore } from "@/stores/env";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const auth = useGlobal();
const env = useEnvStore();
const router = useRouter();
const toast = useToast();
const accounts = useAccountsStore();
const session = useAccountSession();
const { switchingId, errorMsg: switchError, savedAccounts, switchTo, resetError } = useAccountSwitch();
const { hasUpdate } = useAppUpdate();

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(false);
const showLogoutConfirm = ref(false);
const loggingOut = ref(false);
const showAccounts = ref(false);
const showDevStatement = ref(false);

// Keep Varlet Cell typography/colors aligned with the app's Material tokens
const cellVars = {
  "--cell-color": "var(--md-on-surface)",
  "--cell-description-color": "var(--md-on-surface-variant)",
  "--cell-font-size": "14px",
  "--cell-padding": "14px 16px",
  "--cell-border-color": "var(--md-outline-variant)",
  "--cell-icon-right": "12px",
};

const currentUserId = computed(() => auth.user?.userId || "");
const userNameLabel = computed(() => auth.user?.userName?.trim() || "未提供");
const schoolLabel = computed(() => auth.user?.schoolName?.trim() || "未提供");
const teamLabel = computed(
  () => team.value?.teamName?.trim() || auth.user?.orgName?.trim() || "未提供"
);
const teamInitial = computed(() => (team.value?.teamName ?? "").charAt(0).toUpperCase() || "LOGO");

const { unlocked: debugUnlocked, startPress, cancelPress, shouldBlockClick } = useDebugUnlock();

// Short press only closes the dialog; the click fired by releasing a completed hold is ignored.
function onConfirmStatement() {
  if (shouldBlockClick()) return;
  showDevStatement.value = false;
}

watch(debugUnlocked, (value) => {
  if (!value) return;
  showDevStatement.value = false;
  toast.success("开发者调试已解锁，可在设置中进入");
});

// Closing the statement dialog must abort a pending hold
watch(showDevStatement, (open) => {
  if (!open) cancelPress();
});

function goProject() {
  router.push("/about/project");
}

function goSettings() {
  router.push("/about/settings");
}

function openAccounts() {
  resetError();
  showAccounts.value = true;
}

function closeAccounts() {
  if (switchingId.value) return;
  showAccounts.value = false;
  resetError();
}

// Overlay/escape closes go through closeAccounts so its switching guard still applies
function onAccountsUpdateShow(value: boolean) {
  if (!value) closeAccounts();
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
