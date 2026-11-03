import { computed, ref } from "vue";
import { useEnvStore } from "@/stores/env";
import { useUpdateStore } from "@/stores/update";
import { resolveDownloadUrl } from "@/utils/downloadProxy";
import { errorMessage } from "@/utils/error";
import {
  getNativeVersion,
  isNativeApp,
  nativeOpen,
  nativeToast,
  waitForBridge,
} from "@/utils/nativeBridge";
import { readDismissedVersion, rememberDismissedVersion } from "@/utils/updateDismiss";
import { compareVersions } from "@/utils/version";

export interface ReleaseInfo {
  version: string;
  name: string;
  notes: string;
  apkUrl: string;
  apkSize: number;
  pageUrl: string;
  publishedAt: string;
}

export type UpdateState = "idle" | "checking" | "up-to-date" | "available" | "error";

interface GithubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: GithubAsset[];
}

/** Optional read-only token; Vite inlines it at build time (empty means anonymous). */
const GITHUB_TOKEN = (import.meta.env.VITE_GITHUB_TOKEN || "").trim();
const GITHUB_API_VERSION = "2022-11-28";

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

/** Human-readable failure text; built from status/headers only, never from sent headers. */
function githubErrorText(res: Response): string {
  if (res.status === 401) {
    return "GitHub 访问令牌无效或已过期，请检查 VITE_GITHUB_TOKEN";
  }
  if (res.status === 404) {
    return "未找到发布信息（仓库或 Release 不存在，或仓库未公开）";
  }
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (res.status === 429 || remaining === "0") {
      const resetSeconds = Number(res.headers.get("x-ratelimit-reset"));
      const resetAt =
        Number.isFinite(resetSeconds) && resetSeconds > 0
          ? new Date(resetSeconds * 1000).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "";
      const hint = GITHUB_TOKEN ? "请稍后重试" : "请稍后重试，或配置只读 token 提高限额";
      return `GitHub API 请求已达限额${resetAt ? `（预计 ${resetAt} 恢复）` : ""}，${hint}`;
    }
    return "GitHub 拒绝访问（HTTP 403），请确认令牌权限";
  }
  return `版本检查请求失败（HTTP ${res.status}）`;
}

async function fetchLatestRelease(releaseApiUrl: string, apkAssetName: string): Promise<ReleaseInfo> {
  const res = await fetch(releaseApiUrl, {
    headers: githubHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(githubErrorText(res));
  const data = (await res.json()) as GithubRelease;
  const version = (data.tag_name || "").replace(/^v/i, "");
  if (!version) throw new Error("Release 中未找到版本号");
  const apk = data.assets?.find((a) => a.name.toLowerCase() === apkAssetName);
  return {
    version,
    name: data.name || data.tag_name,
    notes: data.body || "",
    apkUrl: apk?.browser_download_url ?? "",
    apkSize: apk?.size ?? 0,
    pageUrl: data.html_url,
    publishedAt: data.published_at,
  };
}

/**
 * Shared pipeline: hand the URL to the default browser via the native bridge.
 * The browser owns the download and its progress; nothing is tracked here.
 */
async function downloadThenInstall(url: string): Promise<"started" | "failed"> {
  const started = await nativeOpen(url);
  if (started) nativeToast("已交给浏览器下载，请在浏览器中查看进度");
  return started ? "started" : "failed";
}

async function openTarget(url: string, apk: boolean, version: string) {
  if (!isNativeApp()) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    if (apk) link.download = `app_v${version}.apk`;
    link.click();
    return;
  }
  await downloadThenInstall(url);
}

// Shared across startup checks, the about page and the global dialog.
const state = ref<UpdateState>("idle");
const currentVersion = ref("");
const release = ref<ReleaseInfo | null>(null);
const error = ref("");
const dialogVisible = ref(false);
const preparing = ref(false);

let prepareController: AbortController | null = null;

const hasUpdate = computed(() => state.value === "available");

export function useAppUpdate() {
  const env = useEnvStore();
  const settings = useUpdateStore();

  /**
   * silent=true is the startup check: failures and "up to date" stay invisible,
   * and a dismissed version does not reopen the dialog.
   */
  async function checkForUpdate(options: { silent?: boolean } = {}) {
    const silent = options.silent ?? false;
    if (state.value === "checking") return;
    state.value = "checking";
    error.value = "";
    release.value = null;
    try {
      // Injection may lag behind app boot; wait briefly before reading the version
      const ready = await waitForBridge();
      const version = ready ? await getNativeVersion() : null;
      if (!version) {
        currentVersion.value = "";
        error.value = ready ? "无法获取应用版本" : "无法获取应用版本（当前非原生环境）";
        state.value = "error";
        dialogVisible.value = !silent;
        return;
      }
      currentVersion.value = version;
      const latest = await fetchLatestRelease(env.links.releaseApiUrl, env.links.apkAssetName);
      release.value = latest;
      if (compareVersions(latest.version, currentVersion.value) > 0) {
        state.value = "available";
        dialogVisible.value = silent ? readDismissedVersion() !== latest.version : true;
      } else {
        state.value = "up-to-date";
        dialogVisible.value = !silent;
      }
    } catch (e) {
      error.value = errorMessage(e);
      state.value = "error";
      dialogVisible.value = !silent;
    }
  }

  /** Manual entry from the about page: always surface progress and errors. */
  function openUpdate() {
    dialogVisible.value = true;
    void checkForUpdate({ silent: false });
  }

  /** "稍后" / overlay close. */
  function dismiss() {
    prepareController?.abort();
    if (state.value === "available" && release.value) {
      rememberDismissedVersion(release.value.version);
    }
    dialogVisible.value = false;
  }

  /** Resolve the download URL through the proxy pipeline, then hand it off. */
  async function downloadAndInstall() {
    const target = release.value;
    if (!target || preparing.value) return;

    preparing.value = true;
    const controller = new AbortController();
    prepareController = controller;
    try {
      await waitForBridge();
      let url = target.pageUrl;
      let apk = false;
      if (target.apkUrl) {
        const resolved = await resolveDownloadUrl(target.apkUrl, {
          proxies: env.update.downloadProxies,
          enabled: settings.proxyEnabled,
          preferredProxy: settings.preferredProxy,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        url = resolved.url;
        apk = true;
        if (resolved.viaProxy && resolved.proxy) {
          settings.setPreferredProxy(resolved.proxy);
        }
      }
      if (!url) return;
      await openTarget(url, apk, target.version);
    } finally {
      preparing.value = false;
      prepareController = null;
    }
  }

  return {
    state,
    currentVersion,
    release,
    error,
    hasUpdate,
    dialogVisible,
    preparing,
    checkForUpdate,
    openUpdate,
    dismiss,
    downloadAndInstall,
  };
}
