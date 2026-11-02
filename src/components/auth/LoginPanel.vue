<template>
  <div
    class="min-h-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary-soft via-white to-white"
    style="padding-top: calc(1rem + env(safe-area-inset-top)); padding-bottom: calc(1rem + env(safe-area-inset-bottom)); padding-left: calc(1rem + env(safe-area-inset-left)); padding-right: calc(1rem + env(safe-area-inset-right))"
  >
    <div class="w-full max-w-md">
      <div class="text-center mb-4">
        <div class="mx-auto h-11 w-11 rounded-xl bg-primary text-white grid place-items-center text-xl font-bold shadow-md shadow-primary/25">{{ env.app.logoText }}</div>
        <h1 class="mt-2 text-xl font-bold text-gray-900">{{ env.app.name }}</h1>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 sm:p-6">
        <AppSegmentedTabs :items="loginModes" :active="mode" block @change="setMode" />

        <form v-if="mode === 'account'" class="flex flex-col gap-3" @submit.prevent="submit">
          <AppInput v-model="form.username" label="账号" placeholder="请输入账号" autocomplete="username" />
          <AppInput v-model="form.password" type="password" label="密码" placeholder="请输入密码" autocomplete="current-password" />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700">验证码</label>
            <div class="flex gap-2 items-stretch">
              <input
                v-model="form.code"
                type="text"
                maxlength="6"
                placeholder="请输入验证码"
                class="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="button"
                class="shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                title="点击刷新验证码"
                @click="fetchCaptcha"
              >
                <img v-if="captchaImg" :src="captchaImg" alt="验证码" class="block h-9 w-auto" />
                <span v-else class="flex h-9 w-24 items-center justify-center gap-1 text-xs text-gray-400">
                  <span class="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-primary"></span>
                  加载中
                </span>
              </button>
            </div>
          </div>

          <AppButton type="submit" variant="primary" size="lg" block :loading="loading">
            登 录
          </AppButton>
        </form>

        <div v-else class="flex flex-col gap-3">
          <AppInput v-model="manualToken" type="textarea" placeholder="粘贴密钥（无需 Bearer 前缀）" />
          <AppButton variant="primary" size="lg" block @click="submitToken">
            使用此密钥进入
          </AppButton>
        </div>

        <div v-if="errorMsg" class="mt-3 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {{ errorMsg }}
        </div>

        <div v-if="savedAccounts.length" class="mt-4 text-center">
          <button
            type="button"
            class="text-xs text-gray-400 transition-colors hover:text-primary"
            @click="showAccounts = true"
          >
            已有保存的账号？点击切换
          </button>
        </div>
      </div>

      <!-- Saved accounts dialog: hidden until requested -->
      <AppModal :open="showAccounts" title="切换账号" @close="closeAccounts">
        <div class="mt-3 max-h-64 space-y-2 overflow-auto">
          <div
            v-for="account in savedAccounts"
            :key="account.userId"
            class="flex items-center gap-2 rounded-xl border border-gray-200 p-3 cursor-pointer transition-colors hover:bg-gray-50"
            @click="switchTo(account.userId)"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate">{{ account.userName || "未提供" }}</p>
              <p class="mt-0.5 text-xs text-gray-500 truncate">ID：{{ account.userId || "未提供" }}</p>
            </div>
          </div>
        </div>
        <p v-if="switchError" class="mt-2 text-xs text-red-500 break-all">{{ switchError }}</p>
      </AppModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getCaptchaImage, appLogin } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountSwitch } from "@/composables/useAccountSwitch";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { useEnvStore } from "@/stores/env";
import { errorMessage } from "@/utils/error";
import { isTempKey, parseTempKey } from "@/utils/tempKey";
import AppInput from "@/components/ui/AppInput.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppModal from "@/components/ui/AppModal.vue";
import AppSegmentedTabs from "@/components/ui/AppSegmentedTabs.vue";

const auth = useGlobal();
const env = useEnvStore();
const toast = useToast();
const session = useAccountSession();
const { switchingId, errorMsg: switchError, savedAccounts, switchTo, resetError } = useAccountSwitch();

const mode = ref<"account" | "key">("account");
const form = ref({ username: "", password: "", code: "" });
const captchaImg = ref("");
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
  captchaImg.value = "";
  try {
    const body = (await getCaptchaImage()).data;
    if (body.code !== 200) throw new Error(body.msg || `验证码接口返回 ${body.code}`);
    captchaImg.value = "data:image/gif;base64," + body.data.img;
    captchaUuid.value = body.data.uuid;
  } catch (e) {
    errorMsg.value = "验证码加载失败：" + errorMessage(e);
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