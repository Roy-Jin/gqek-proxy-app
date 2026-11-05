<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="mb-4">
      <h2 class="text-[22px] leading-7 font-medium text-on-surface">关于</h2>
      <p class="mt-1 text-sm text-on-surface-variant">{{ env.about.subtitle }}</p>
    </div>

    <!-- Current account & team -->
    <VarPaper class="mb-4 p-4" :elevation="0" :radius="16" style="--paper-background: var(--md-surface-container)">
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
      </div>
    </VarPaper>
    <VarPaper class="mb-4 overflow-hidden" :elevation="0" :radius="16"
      style="--paper-background: var(--md-surface-container)" :style="cellVars">
      <VarCell title="账号相关" icon="card-account-details-outline" icon-class="text-on-surface-variant"
        ripple @click="goAccount">
        <template #extra>
          <VarIcon name="chevron-right" :size="20" class="text-on-surface-variant" />
        </template>
      </VarCell>
    </VarPaper>

    <!-- Entries: project info & settings -->
    <VarPaper class="overflow-hidden" :elevation="0" :radius="16"
      style="--paper-background: var(--md-surface-container)" :style="cellVars">
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
    </VarPaper>

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
  Paper as VarPaper,
} from "@varlet/ui";
import { listTeam } from "@/api";
import type { TeamInfo } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useDebugUnlock } from "@/composables/useDebugUnlock";
import { useEnvStore } from "@/stores/env";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";

// `Dialog` is Varlet's imperative API; the render component lives on `.Component`
const VarDialog = Dialog.Component;

const auth = useGlobal();
const env = useEnvStore();
const router = useRouter();
const toast = useToast();
const session = useAccountSession();
const { hasUpdate } = useAppUpdate();

const team = ref<TeamInfo | null>(null);
const teamLoading = ref(false);
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
  toast.success("开发者调试已解锁！");
  router.push("/about/debug");
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

function goAccount() {
  router.push("/about/account");
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

onMounted(() => {
  void session.refreshCurrentUser();
  void fetchTeam();
});
</script>
