<template>
  <div
    class="min-h-full flex items-center justify-center p-4 sm:p-6 bg-surface"
    style="padding-top: calc(1rem + env(safe-area-inset-top)); padding-bottom: calc(1rem + env(safe-area-inset-bottom)); padding-left: calc(1rem + env(safe-area-inset-left)); padding-right: calc(1rem + env(safe-area-inset-right))"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-6">
        <div class="mx-auto h-12 w-12 rounded-lg bg-primary text-on-primary grid place-items-center text-xl font-bold">{{ env.app.logoText }}</div>
        <h1 class="mt-3 text-[22px] leading-7 font-medium text-on-surface">{{ env.app.name }}</h1>
      </div>

      <div class="rounded-xl bg-surface-low p-5 sm:p-6">
        <AppSegmented :items="loginModes" :active="mode" block @change="setMode" />

        <form v-if="mode === 'account'" class="mt-4 flex flex-col gap-3" @submit.prevent="submit">
          <VarInput v-model="form.username" variant="outlined" placeholder="请输入账号" clearable type="number"/>
          <VarInput v-model="form.password" type="password" variant="outlined" placeholder="请输入密码" clearable/>

          <div class="flex items-stretch gap-2">
            <VarInput
              v-model="form.code"
              variant="outlined"
              placeholder="请输入验证码"
              class="flex-1 min-w-0"
              type="number"
            />
            <button
              type="button"
              class="captcha-tile shrink-0 grid place-items-center"
              aria-label="点击刷新验证码"
              :disabled="captchaLoading"
              @click="fetchCaptcha"
            >
              <img
                v-if="captchaImg"
                :src="captchaImg"
                alt="验证码"
                class="block h-full w-full object-contain"
                draggable="false"
              />
              <VarLoading v-else type="circle" size="mini" color="var(--md-primary)" />
            </button>
          </div>

          <VarButton type="primary" native-type="submit" size="large" block :loading="loading">
            登 录
          </VarButton>
        </form>

        <div v-else class="mt-4 flex flex-col gap-3">
          <VarInput
            v-model="manualToken"
            textarea
            :rows="3"
            variant="outlined"
            clearable
            placeholder="粘贴密钥（无需 Bearer 前缀）"
          />
          <div class="flex gap-2">
            <VarButton type="primary" tonal size="large" class="shrink-0" @click="pasteToken">
              粘贴
            </VarButton>
            <VarButton type="primary" size="large" block @click="submitToken">
              使用此密钥进入
            </VarButton>
          </div>
        </div>

        <div v-if="errorMsg" class="mt-3 px-3 py-2.5 rounded-md bg-error-container text-sm text-on-error-container">
          {{ errorMsg }}
        </div>

        <div v-if="savedAccounts.length" class="mt-4 text-center">
          <VarButton text type="primary" size="small" @click="showAccounts = true">
            已有保存的账号？点击切换
          </VarButton>
        </div>
      </div>

      <!-- Saved accounts dialog: hidden until requested -->
      <VarDialog
        :show="showAccounts"
        title="切换账号"
        :confirm-button="false"
        :cancel-button="false"
        close-on-click-overlay
        @update:show="closeAccounts"
      >
        <div class="mt-1 max-h-64 space-y-2 overflow-auto">
          <div
            v-for="account in savedAccounts"
            :key="account.userId"
            v-ripple
            class="relative flex items-center gap-2 overflow-hidden rounded-lg bg-surface-high p-3 cursor-pointer"
            @click="switchTo(account.userId)"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-on-surface truncate">{{ account.userName || "未提供" }}</p>
              <p class="mt-0.5 text-xs text-on-surface-variant truncate">ID：{{ account.userId || "未提供" }}</p>
            </div>
          </div>
        </div>
        <p v-if="switchError" class="mt-2 text-xs text-error break-all">{{ switchError }}</p>
      </VarDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Button as VarButton,
  Dialog,
  Input as VarInput,
  Loading as VarLoading,
  Ripple,
} from "@varlet/ui";
import { getCaptchaImage, appLogin } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { useEnvStore } from "@/stores/env";
import { errorMessage } from "@/utils/error";
import { isTempKey, parseTempKey } from "@/utils/tempKey";
import AppSegmented from "@/components/ui/AppSegmented.vue";

const VarDialog = Dialog.Component;
const vRipple = Ripple;

const auth = useGlobal();
const env = useEnvStore();
const toast = useToast();
const session = useAccountSession();
const { switchingId, errorMsg: switchError, savedAccounts, switchTo, resetError } = useAccountSwitch();

const mode = ref<"account" | "key">("account");
const form = ref({ username: "", password: "", code: "" });
const captchaImg = ref("");
const captchaLoading = ref(false);
const captchaUuid = ref("");
const loading = ref(false);
const errorMsg = ref("");
const manualToken = ref("");
const showAccounts = ref(false);

const loginModes: { label: string; value: "account" | "key" }[] = [
  { label: "账号登录", value: "account" },
  { label: "密钥登录", value: "key" },
];

function closeAccounts() {
  if (switchingId.value) return;
  showAccounts.value = false;
  resetError();
}

function setMode(m: "account" | "key") {
  mode.value = m;
  errorMsg.value = "";
}

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function pasteToken() {
  if (!navigator.clipboard?.readText) {
    errorMsg.value = "当前环境不支持读取剪贴板，请手动粘贴";
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) {
      errorMsg.value = "剪贴板为空";
      return;
    }
    manualToken.value = text.trim();
    errorMsg.value = "";
  } catch {
    errorMsg.value = "读取剪贴板失败，请检查浏览器权限后重试";
  }
}

function submitToken() {
  const raw = manualToken.value.trim();
  if (!raw) {
    errorMsg.value = "请输入密钥";
    return;
  }

  let token = raw;
  if (isTempKey(raw)) {
    const parsed = parseTempKey(raw);
    if (!parsed.ok) {
      errorMsg.value = parsed.message;
      return;
    }
    token = parsed.token;
  }

  errorMsg.value = "";
  auth.setToken(token);
  auth.isAuthed = true;
  void session.refreshCurrentUser();
}

async function fetchCaptcha() {
  if (captchaLoading.value) return;
  captchaLoading.value = true;
  captchaImg.value = "";
  try {
    const body = (await getCaptchaImage()).data;
    if (body.code !== 200) throw new Error(body.msg || `验证码接口返回 ${body.code}`);
    captchaImg.value = "data:image/gif;base64," + body.data.img;
    captchaUuid.value = body.data.uuid;
    form.value.code = "";
  } catch (e) {
    errorMsg.value = "验证码加载失败：" + errorMessage(e);
  } finally {
    captchaLoading.value = false;
  }
}

async function submit() {
  if (!form.value.username || !form.value.password || !form.value.code) {
    errorMsg.value = "请填写账号、密码和验证码";
    return;
  }
  loading.value = true;
  errorMsg.value = "";
  try {
    const body = (
      await appLogin({
        username: form.value.username,
        password: form.value.password,
        code: form.value.code,
        uuid: captchaUuid.value,
        schoolId: env.auth.defaultSchoolId,
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `登录失败（${body.code}）`);
    auth.setToken(body.data.token);
    auth.isAuthed = true;
    void session.refreshCurrentUser();
    toast.success("登录成功，欢迎回来");
  } catch (e) {
    errorMsg.value = errorMessage(e);
    form.value.code = "";
    fetchCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchCaptcha);
</script>

<style scoped>
/* Captcha tile mirrors the outlined input: same border, radius and stretched height */
.captcha-tile {
  width: 128px;
  overflow: hidden;
  border: 1px solid var(--md-outline);
  border-radius: 8px;
  background: transparent;
  transition: background-color var(--md-motion-fast) var(--md-ease-standard);
}

.captcha-tile:active:not(:disabled) {
  background: var(--md-surface-high);
}

.captcha-tile:disabled {
  opacity: 0.6;
}
</style>
