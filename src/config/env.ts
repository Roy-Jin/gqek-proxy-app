/**
 * Immutable defaults for the env store and Node scripts.
 * App code should read from useEnvStore(); scripts can import this module safely
 * because it never touches Pinia.
 */

export interface AppConfig {
  readonly name: string;
  readonly logoText: string;
}

export interface AuthConfig {
  readonly defaultSchoolId: string;
}

export interface DeveloperConfig {
  readonly contactQq: string;
  readonly statementTitle: string;
  readonly statementText: string;
}

export interface AboutConfig {
  readonly subtitle: string;
}

export interface LinksConfig {
  readonly apiBaseUrl: string;
  readonly releaseApiUrl: string;
  readonly apkAssetName: string;
  readonly apkDownloadUrl: string;
}

export interface UpdateConfig {
  readonly proxyEnabled: boolean;
  readonly downloadProxies: readonly string[];
}

export interface UiConfig {
  readonly emptyText: string;
  readonly loadingText: string;
  readonly toastDurationMs: number;
}

export const appConfig: AppConfig = Object.freeze({
  name: "赣青二课代理平台",
  logoText: "赣",
});

export const authConfig: AuthConfig = Object.freeze({
  defaultSchoolId: "14241",
});

const CONTACT_QQ = "724011786";

export const developerConfig: DeveloperConfig = Object.freeze({
  contactQq: CONTACT_QQ,
  statementTitle: "开发者声明",
  statementText: `本系统仅供组织（团队）负责人内部使用，未经授权请勿对外传播。软件仅用于学习交流，如涉及侵权，可联系作者（QQ ${CONTACT_QQ}）删除。`,
});

export const aboutConfig: AboutConfig = Object.freeze({
  subtitle: "应用信息与账号管理",
});

export const linksConfig: LinksConfig = Object.freeze({
  apiBaseUrl: "https://gqhw.jxmediacenter.com/prod-api",
  releaseApiUrl: "https://api.github.com/repos/Roy-Jin/gqek-proxy-app/releases/latest",
  apkAssetName: "gqek-proxy.apk",
  apkDownloadUrl:
    "https://github.com/Roy-Jin/gqek-proxy-app/releases/latest/download/gqek-proxy.apk",
});

export const updateConfig: UpdateConfig = Object.freeze({
  proxyEnabled: true,
  downloadProxies: Object.freeze([
    "https://gh.inkchills.cn/",
    "https://wget.la/",
    "https://gh-proxy.com/",
    "https://ghproxy.net/"
  ]),
});

export const uiConfig: UiConfig = Object.freeze({
  emptyText: "暂无数据",
  loadingText: "加载中...",
  toastDurationMs: 3000,
});
