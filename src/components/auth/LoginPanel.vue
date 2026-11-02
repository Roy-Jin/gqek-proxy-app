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
        <div class="flex p-1 rounded-xl bg-gray-100 mb-4">
          <button
            type="button"
            class="flex-1 py-1.5 text-sm rounded-lg transition-colors"
            :class="mode === 'account' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="setMode('account')"
          >
            账号登录
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 text-sm rounded-lg transition-colors"
            :class="mode === 'key' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
            @click="setMode('key')"
          >
            密钥登录
          </button>
        </div>

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
import { computed, ref, onMounted } from "vue";
import { getCaptchaImage, appLogin } from "@/api";
import { useAccountSession } from "@/composables/useAccountSession";
import { useAccountsStore } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import { useEnvStore } from "@/stores/env";
import AppInput from "@/components/ui/AppInput.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppModal from "@/components/ui/AppModal.vue";

const auth = useGlobal();
const env = useEnvStore();
const toast = useToast();
const accounts = useAccountsStore();
const session = useAccountSession();

const mode = ref<"account" | "key">("account");
const form = ref({ username: "", password: "", code: "" });
const captchaImg = ref("");
const captchaUuid = ref("");
const loading = ref(false);
const errorMsg = ref("");
const manualToken = ref("");
const showAccounts = ref(false);
const switchingId = ref("");
const switchError = ref("");

/** Token-free projection; the template never sees stored credentials. */
const savedAccounts = computed(() => accounts.summaries);

function closeAccounts() {
  if (switchingId.value) return;
  showAccounts.value = false;
  switchError.value = "";
}

async function switchTo(userId: string) {
  if (switchingId.value) return;
  const account = accounts.accounts.find((item) => item.userId === userId);
  if (!account) return;
  switchingId.value = userId;
  switchError.value = "";
  try {
    await session.switchAccount(account);
  } catch (e) {
    switchError.value = "账号切换失败：" + (e instanceof Error ? e.message : String(e));
    switchingId.value = "";
  }
}

function setMode(m: "account" | "key") {
  mode.value = m;
  errorMsg.value = "";
}

function submitToken() {
  const v = manualToken.value.trim();
  if (!v) {
    errorMsg.value = "请输入密钥";
    return;
  }
  auth.setToken(v);
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
    errorMsg.value = "验证码加载失败：" + (e instanceof Error ? e.message : String(e));
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
    errorMsg.value = e instanceof Error ? e.message : String(e);
    form.value.code = "";
    fetchCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchCaptcha);
</script>