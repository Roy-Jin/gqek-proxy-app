<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <AppCard :padding="false">
      <div class="divide-y divide-gray-100">
        <button
          v-for="item in modules"
          :key="item.path"
          type="button"
          class="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-100"
          @click="go(item.path)"
        >
          <span
            class="h-9 w-9 shrink-0 rounded-lg bg-primary-soft text-primary-fg grid place-items-center"
          >
            <AppIcon :name="item.icon" class="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-gray-900">{{ item.label }}</span>
            <span class="mt-0.5 block text-xs text-gray-500">{{ item.description }}</span>
          </span>
          <AppIcon name="chevron-right" class="h-4 w-4 shrink-0 text-gray-400" />
        </button>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { definePage } from "vue-router/experimental";
import AppCard from "@/components/ui/AppCard.vue";
import AppIcon from "@/components/ui/AppIcon.vue";

definePage({ meta: { title: "开发者调试" } });

const router = useRouter();

const modules = [
  {
    label: "账号与密钥",
    description: "查看当前账号信息，复制密钥或生成临时密钥",
    path: "/about/debug/account",
    icon: "users",
  },
  {
    label: "网络与接口",
    description: "检测接口连通性，发起自定义 API 请求",
    path: "/about/debug/network",
    icon: "refresh",
  },
  {
    label: "JS 调试",
    description: "在线执行 JS 代码，支持 await 与 console 输出",
    path: "/about/debug/js",
    icon: "code",
  },
  {
    label: "运行日志",
    description: "查看控制台日志记录并管理开关",
    path: "/about/debug/log",
    icon: "list",
  },
  {
    label: "原生桥接",
    description: "检查 NativeBridge 能力与应用版本",
    path: "/about/debug/bridge",
    icon: "info",
  },
  {
    label: "下载代理",
    description: "探测下载加速节点并调整代理优先级",
    path: "/about/debug/proxy",
    icon: "pin",
  },
  {
    label: "本地存储",
    description: "查看和清理本地存储数据",
    path: "/about/debug/storage",
    icon: "inbox",
  },
] as const;

function go(path: string) {
  router.push(path);
}
</script>
