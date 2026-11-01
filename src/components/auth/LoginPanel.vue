<template>
  <div class="min-h-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-primary-soft via-white to-white">
    <div class="w-full max-w-md">
      <div class="text-center mb-6">
        <div class="mx-auto h-14 w-14 rounded-2xl bg-primary text-white grid place-items-center text-2xl font-bold shadow-lg shadow-primary/25">赣</div>
        <h1 class="mt-4 text-2xl font-bold text-gray-900">赣青二课代理平台</h1>
        <p class="mt-1.5 text-sm text-gray-500">请登录后继续访问</p>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200/70 shadow-xl p-6 sm:p-8">
        <div class="flex p-1 rounded-xl bg-gray-100 mb-5">
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

        <form v-if="mode === 'account'" class="flex flex-col gap-4" @submit.prevent="submit">
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
                class="shrink-0 w-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                title="点击刷新验证码"
                @click="fetchCaptcha"
              >
                <img v-if="captchaImg" :src="captchaImg" alt="验证码" class="w-full h-full object-cover" />
                <span v-else class="flex items-center justify-center gap-1 text-xs text-gray-400">
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

        <div v-else class="flex flex-col gap-4">
          <AppInput v-model="manualToken" type="textarea" placeholder="粘贴密钥（无需 Bearer 前缀）" />
          <AppButton variant="primary" size="lg" block @click="submitToken">
            使用此密钥进入
          </AppButton>
        </div>

        <div v-if="errorMsg" class="mt-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {{ errorMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getCaptchaImage, appLogin } from "@/api";
import { useGlobal } from "@/stores/global";
import { useToast } from "@/composables/useToast";
import AppInput from "@/components/ui/AppInput.vue";
import AppButton from "@/components/ui/AppButton.vue";

const auth = useGlobal();
const toast = useToast();

const SCHOOL_ID = "14241";

const mode = ref<"account" | "key">("account");
const form = ref({ username: "", password: "", code: "" });
const captchaImg = ref("");
const captchaUuid = ref("");
const loading = ref(false);
const errorMsg = ref("");
const manualToken = ref("");

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
        schoolId: SCHOOL_ID,
      })
    ).data;
    if (body.code !== 200) throw new Error(body.msg || `登录失败（${body.code}）`);
    auth.setToken(body.data.token);
    auth.isAuthed = true;
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