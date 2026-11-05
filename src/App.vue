<template>
  <UpdateDialog />

  <!-- Boot: validating saved token -->
  <div v-if="!authChecked" class="flex-1 flex flex-col items-center justify-center gap-4">
    <VarLoading type="circle" color="var(--md-primary)" />
    <p class="text-sm text-on-surface-variant">正在验证登录状态...</p>
  </div>

  <!-- No valid token: login page -->
  <LoginPanel v-else-if="!isAuthed" class="flex-1 min-h-0 overflow-auto" />

  <!-- Authed: mobile app layout -->
  <div v-else class="flex flex-col flex-1 min-h-0">
    <VarAppBar
      class="app-bar"
      type="surface"
      round
      :title-position="isSubpage ? 'left' : 'center'"
      :title="headerTitle"
      :fixed="false"
      :border="false"
      :elevation="0"
      safe-area-top
    >
      <template #left>
        <VarButton
          v-if="isSubpage"
          text
          round
          icon-container
          text-color="var(--md-on-surface)"
          aria-label="返回"
          @click="back"
        >
          <ArrowLeft :size="22" />
        </VarButton>
      </template>

      <!-- Pages mount their own header actions here via Teleport -->
      <template #right>
        <div id="app-bar-action" class="flex items-center gap-1"></div>
      </template>
    </VarAppBar>

    <main
      class="flex-1 min-h-0 overflow-auto overscroll-contain"
      style="padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right)"
    >
      <RouterView v-slot="{ Component }">
        <Transition :name="isSubpage ? 'subpage' : 'page'" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <VarBottomNavigation
      v-if="!isSubpage"
      variant
      class="app-nav"
      :active="navActive"
      :animated="true"
      :bordered="false"
      safe-area
      @change="onNavChange"
    >
      <VarBottomNavigationItem
        v-for="item in navItems"
        :key="item.name"
        :name="item.name"
        :label="item.label"
      >
        <template #icon>
          <component :is="item.icon" :size="22" />
        </template>
      </VarBottomNavigationItem>
    </VarBottomNavigation>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import {
  AppBar as VarAppBar,
  BottomNavigation as VarBottomNavigation,
  BottomNavigationItem as VarBottomNavigationItem,
  Button as VarButton,
  Loading as VarLoading,
} from "@varlet/ui";
import { getInfo } from "@/api";
import type { LucideIcon } from "@lucide/vue";
import { ArrowLeft, Goal, Info, ListTodo } from "@lucide/vue";
import { useAccountSession, toUserBrief } from "@/composables/useAccountSession";
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useEnvStore } from "@/stores/env";
import { useGlobal } from "@/stores/global";
import { useUpdateStore } from "@/stores/update";
import LoginPanel from "@/components/auth/LoginPanel.vue";
import UpdateDialog from "@/components/update/UpdateDialog.vue";
import { DEBUG_UNLOCK_FLAG } from "./composables/useDebugUnlock";

const auth = useGlobal();
const env = useEnvStore();
const session = useAccountSession();
const updateSettings = useUpdateStore();
const { checkForUpdate } = useAppUpdate();
const { isAuthed, authChecked } = storeToRefs(auth);
const route = useRoute();

const router = useRouter();

const isSubpage = computed(() => route.path.split("/").filter(Boolean).length > 1);

const headerTitle = computed(() => {
  if (!isSubpage.value) return env.app.name;
  const t = route.meta.title;
  return typeof t === "string" && t ? t : env.app.name;
});

function back() {
  if (window.history.length > 1) {
    router.back();
  } else {
    const parent = route.path.slice(0, route.path.lastIndexOf("/")) || "/";
    router.replace(parent);
  }
}

interface NavItem {
  name: "activity" | "todo" | "about";
  path: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: "activity", path: "/activity", label: "活动", icon: Goal },
  { name: "todo", path: "/todo", label: "待办", icon: ListTodo },
  { name: "about", path: "/about", label: "关于", icon: Info },
];

const navActive = computed(
  () => navItems.find((item) => route.path.startsWith(item.path))?.name ?? "activity"
);

function onNavChange(name: string | number) {
  const item = navItems.find((entry) => entry.name === name);
  if (item) router.replace(item.path);
}

/** Validate saved token on boot; fall back to login when invalid */
async function checkAuth() {
  const token = auth.token;
  if (!token) {
    auth.isAuthed = false;
    auth.authChecked = true;
    return;
  }
  try {
    const body = (await getInfo()).data;
    if (body.code === 200) {
      auth.setUser(toUserBrief(body));
      auth.isAuthed = true;
      session.rememberCurrent();
    } else {
      // Token rejected: drop the stale saved account so it no longer offers a one-click switch
      session.forgetCurrent();
      auth.clear();
    }
  } catch {
    // Network failure: keep the saved token for the next launch
    auth.isAuthed = false;
  } finally {
    auth.authChecked = true;
  }
}

onMounted(() => {
  checkAuth();
  // Always check at startup; with auto check off the dialog stays closed and only
  // the update badge on the about page is refreshed
  if (!import.meta.env.DEV) {
    void checkForUpdate({ silent: true, quiet: !updateSettings.autoCheckEnabled });
  }
  import.meta.env.DEV && sessionStorage.setItem(DEBUG_UNLOCK_FLAG, "1");
});
</script>

<style scoped>
.app-bar {
  --app-bar-surface-color: var(--md-surface);
  --app-bar-surface-text-color: var(--md-on-surface);
  --app-bar-title-font-size: 20px;
}

.app-bar :deep(.var-app-bar__title) {
  font-weight: 500;
}

.app-nav {
  --bottom-navigation-background-color: var(--md-surface-container);
  --bottom-navigation-item-variant-active-background-color: var(--md-secondary-container);
  --bottom-navigation-item-variant-active-color: var(--md-on-surface);
  --bottom-navigation-item-inactive-color: var(--md-on-surface-variant);
}

.page-enter-active,
.page-leave-active {
  transition: opacity var(--md-motion-base) var(--md-ease-standard);
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.subpage-enter-active {
  transition:
    opacity var(--md-motion-slow) var(--md-ease-standard),
    transform var(--md-motion-slow) var(--md-ease-standard);
}
.subpage-leave-active {
  transition: opacity var(--md-motion-fast) var(--md-ease-standard);
}
.subpage-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.subpage-leave-to {
  opacity: 0;
}
</style>
