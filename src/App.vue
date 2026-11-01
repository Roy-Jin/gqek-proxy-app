<template>
  <ToastHost />

  <!-- Boot: validating saved token -->
  <div v-if="!authChecked" class="flex-1 flex items-center justify-center">
    <AppSpinner text="正在验证登录状态..." />
  </div>

  <!-- No valid token: login page -->
  <LoginPanel v-else-if="!isAuthed" class="flex-1 min-h-0 overflow-auto" />

  <!-- Authed: mobile app layout -->
  <div v-else class="flex flex-col flex-1 min-h-0">
    <header class="shrink-0 h-12 flex items-center justify-center px-4 bg-white border-b border-gray-100">
      <div class="flex items-center gap-2">
        <div class="h-6 w-6 rounded-md bg-primary text-white grid place-items-center text-xs font-bold">赣</div>
        <span class="text-sm font-semibold text-gray-900">赣青二科管理平台</span>
      </div>
    </header>

    <main class="flex-1 min-h-0 overflow-auto">
      <Transition :name="isSubpage ? 'subpage' : 'page'" mode="out-in">
        <RouterView />
      </Transition>
    </main>

    <nav v-if="!isSubpage" class="shrink-0 bg-white/95 backdrop-blur border-t border-gray-100" style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="max-w-md mx-auto flex items-stretch">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          replace
          class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors"
          :class="isActive(item.path) ? 'text-primary font-medium' : 'text-gray-400'"
        >
          <AppIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import { getInfo } from "@/api";
import { useGlobal } from "@/stores/global";
import LoginPanel from "@/components/auth/LoginPanel.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppSpinner from "@/components/ui/AppSpinner.vue";
import ToastHost from "@/components/ui/ToastHost.vue";

const auth = useGlobal();
const { isAuthed, authChecked } = storeToRefs(auth);
const route = useRoute();

const isSubpage = computed(() => route.path.split("/").filter(Boolean).length > 1);

const navItems = [
  { path: "/activity", label: "活动", icon: "flag" },
  { path: "/todo", label: "代办", icon: "list" },
  { path: "/about", label: "关于", icon: "info" },
];

function isActive(path: string) {
  return route.path.startsWith(path);
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
      auth.setUser({
        userName: body.data.user.userName,
        schoolName: body.data.user.schoolName,
        userId: String(body.data.user.userId),
      });
      auth.isAuthed = true;
    } else {
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
  document.oncontextmenu = () => false;
  document.addEventListener(
    "keydown",
    (e) => e.key === "F12" && !import.meta.env.DEV && e.preventDefault()
  );
  checkAuth();
});
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.subpage-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.subpage-leave-active {
  transition: opacity 0.2s ease;
}
.subpage-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.subpage-leave-to {
  opacity: 0;
}
</style>