import { computed, ref } from "vue";
import { useEnvStore } from "@/stores/env";
import {
  getNativeVersion,
  isNativeApp,
  nativeOpen,
  nativeToast,
  waitForBridge,
} from "@/utils/nativeBridge";

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

/** Compare dotted versions ("v1.2.0" vs "1.2"): positive when a is newer. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, "").split(".");
  const pb = b.replace(/^v/i, "").split(".");
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (Number(pa[i]) || 0) - (Number(pb[i]) || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

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

async function fetchLatestRelease(releaseApiUrl: string, apkAssetName: string): Promise<ReleaseInfo> {
  const res = await fetch(releaseApiUrl, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`版本检查请求失败（HTTP ${res.status}）`);
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

export function useAppUpdate() {
  const env = useEnvStore();
  const state = ref<UpdateState>("idle");
  const currentVersion = ref("");
  const release = ref<ReleaseInfo | null>(null);
  const error = ref("");

  const hasUpdate = computed(() => state.value === "available");

  async function checkForUpdate() {
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
        return;
      }
      currentVersion.value = version;
      const latest = await fetchLatestRelease(env.links.releaseApiUrl, env.links.apkAssetName);
      release.value = latest;
      state.value =
        compareVersions(latest.version, currentVersion.value) > 0 ? "available" : "up-to-date";
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      state.value = "error";
    }
  }

  /** Hand the fetched release to the browser, which downloads and installs it. */
  async function downloadAndInstall() {
    const target = release.value;
    if (!target) return;
    await waitForBridge();
    if (!isNativeApp()) {
      const link = document.createElement("a");
      link.href = target.apkUrl || target.pageUrl;
      link.target = "_blank";
      if (target.apkUrl) link.download = `app_v${target.version}.apk`;
      link.click();
      return;
    }
    await downloadThenInstall(target.apkUrl || target.pageUrl);
  }

  return {
    state,
    currentVersion,
    release,
    error,
    hasUpdate,
    checkForUpdate,
    downloadAndInstall,
  };
}
