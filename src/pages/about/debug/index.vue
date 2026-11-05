<template>
  <div class="p-4 max-w-3xl mx-auto">
    <div class="mb-4">
      <h2 class="text-[22px] leading-7 font-medium text-on-surface">开发者调试</h2>
      <p class="mt-1 text-sm text-on-surface-variant">诊断工具与调试入口</p>
    </div>

    <VarPaper class="divide-y divide-outline-variant overflow-hidden" :elevation="0" :radius="16">
      <button
        v-for="item in modules"
        :key="item.path"
        v-ripple
        type="button"
        class="flex w-full items-center gap-3 px-5 py-4 text-left"
        @click="go(item.path)"
      >
        <span
          class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"
        >
          <component :is="item.icon" :size="20" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-on-surface">{{ item.label }}</span>
          <span class="mt-0.5 block text-xs text-on-surface-variant">{{ item.description }}</span>
        </span>
        <ChevronRight :size="20" class="shrink-0 text-on-surface-variant" />
      </button>
    </VarPaper>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { definePage } from "vue-router/experimental";
import { ChevronRight, CircleUser, CodeXml, Database, Download, History, Info, Wifi } from "@lucide/vue";
import { Paper as VarPaper, Ripple as vRipple } from "@varlet/ui";

definePage({ meta: { title: "开发者调试" } });

const router = useRouter();

const modules = [
  {
    label: "账号与密钥",
    description: "查看当前账号信息，复制密钥或生成临时密钥",
    path: "/about/debug/account",
    icon: CircleUser,
  },
  {
    label: "网络与接口",
    description: "检测接口连通性，发起自定义 API 请求",
    path: "/about/debug/network",
    icon: Wifi,
  },
  {
    label: "JS 调试",
    description: "在线执行 JS 代码，支持 await 与 console 输出",
    path: "/about/debug/js",
    icon: CodeXml,
  },
  {
    label: "运行日志",
    description: "查看控制台日志记录并管理开关",
    path: "/about/debug/log",
    icon: History,
  },
  {
    label: "原生桥接",
    description: "检查 NativeBridge 能力与应用版本",
    path: "/about/debug/bridge",
    icon: Info,
  },
  {
    label: "下载代理",
    description: "探测下载加速节点并调整代理优先级",
    path: "/about/debug/proxy",
    icon: Download,
  },
  {
    label: "本地存储",
    description: "查看和清理本地存储数据",
    path: "/about/debug/storage",
    icon: Database,
  },
] as const;

function go(path: string) {
  router.push(path);
}
</script>
