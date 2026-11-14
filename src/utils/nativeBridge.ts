/**
 * Typed wrapper over the WebToApp-injected `window.NativeBridge`.
 * All bridge specifics live in this file so call sites stay platform-agnostic.
 * Ref: https://shiaho777.github.io/web-to-app/zh/extensions/native-bridge
 */

export interface BridgeAppInfo {
  versionName?: string;
  versionCode?: number | string;
  packageName?: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    NativeBridge?: Record<string, (...args: unknown[]) => unknown>;
    /** Injected by WebToApp's CORS-bypass script; CORS_BYPASS when enabled. */
    __wta_private_network_scope__?: string;
    /** Async native HTTP mailbox shared with WebToApp's own fetch wrapper. */
    __wtaNativeHttpPending?: Record<string, (raw: string) => void>;
    __wtaNativeHttpResponse?: (id: string, raw: string) => void;
  }
}

type Bridge = Record<string, (...args: unknown[]) => unknown>;

/**
 * Always read the bridge fresh from window: page reloads replace the injected
 * object, and a cached reference goes stale ("non-injected object" errors).
 */
function getBridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  const b = window.NativeBridge;
  return typeof b === "object" && b !== null ? b : null;
}

export function isNativeApp(): boolean {
  return getBridge() !== null;
}

/**
 * Resolve once the WebView has injected the bridge. Injection can lag behind
 * module evaluation, so launch-time callers should await this first.
 */
export function waitForBridge(timeoutMs = 3000, intervalMs = 100): Promise<boolean> {
  return new Promise((resolve) => {
    if (isNativeApp()) return resolve(true);
    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
      if (isNativeApp()) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() >= deadline) {
        clearInterval(timer);
        resolve(false);
      }
    }, intervalMs);
  });
}

/** Available bridge method names, used by the debug page. */
export function listBridgeMethods(): string[] {
  const bridge = getBridge();
  return bridge ? Object.keys(bridge).sort() : [];
}

/** Bridge methods may return plain values or JSON strings; normalize here. */
function maybeParse(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

/**
 * Defensive bridge call: never throws, returns null on failure.
 * The Java proxy rejects detached invocations ("non-injected object"), so the
 * method must be applied with the bridge itself as the receiver.
 */
async function callNative<T>(method: string, ...args: unknown[]): Promise<T | null> {
  const bridge = getBridge();
  const fn = bridge?.[method];
  if (typeof fn !== "function") {
    console.warn(`[NativeBridge] method unavailable: ${method}`);
    return null;
  }
  try {
    let result = Reflect.apply(fn, bridge, args);
    if (result instanceof Promise) result = await result;
    return maybeParse(result) as T;
  } catch (e) {
    console.warn(`[NativeBridge] ${method} failed`, e);
    return null;
  }
}

/**
 * Same guard as callNative but for void methods: resolves true when the
 * invocation itself succeeded, false when unavailable or thrown.
 */
async function callNativeVoid(method: string, ...args: unknown[]): Promise<boolean> {
  const bridge = getBridge();
  const fn = bridge?.[method];
  if (typeof fn !== "function") {
    console.warn(`[NativeBridge] method unavailable: ${method}`);
    return false;
  }
  try {
    const result = Reflect.apply(fn, bridge, args);
    if (result instanceof Promise) await result;
    return true;
  } catch (e) {
    console.warn(`[NativeBridge] ${method} failed`, e);
    return false;
  }
}

/** Installed app version (versionName); null outside the native shell. */
export async function getNativeVersion(): Promise<string | null> {
  const info = await callNative<BridgeAppInfo>("getAppInfo");
  return typeof info?.versionName === "string" && info.versionName ? info.versionName : null;
}

export function nativeToast(message: string) {
  void callNativeVoid("showToast", message);
}

/**
 * Ask the OS to open a URL in the default browser. For file URLs the browser
 * handles the download. Resolves true when the invocation itself succeeded.
 */
export function nativeOpen(target: string) {
  return callNativeVoid("openUrl", target);
}

/* ==================== Native HTTP transport ==================== */

export interface NativeHttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  /** Plain-text body; the bridge payload carries it as base64. */
  body?: string;
}

export interface NativeHttpResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  text: string;
}

/** Bridge failures, split so callers can keep the timeout message distinct. */
export class NativeHttpError extends Error {
  readonly timedOut: boolean;

  constructor(message: string, timedOut = false) {
    super(message);
    this.name = "NativeHttpError";
    this.timedOut = timedOut;
  }
}

interface BridgeHttpReply {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  bodyBase64?: string;
  message?: string;
  error?: string;
}

let httpSeq = 0;

/**
 * WebToApp >= 2.8.8 wraps window.fetch in CORS-bypass mode: it runs the WebView
 * fetch first and retries through the native bridge once that rejects. Since a
 * cross-origin response without CORS headers still reaches the server, a POST
 * gets submitted twice (the duplicate is rejected by repeat-submit filters).
 * Under those conditions requests go straight to the bridge instead.
 */
export function canUseNativeHttp(): boolean {
  const bridge = getBridge();
  if (!bridge || typeof bridge.httpRequestAsync !== "function") return false;
  return window.__wta_private_network_scope__ === "CORS_BYPASS";
}

function textToBase64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToText(base64: string): string {
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Native delivers replies through a page-global callback keyed by request id. */
function httpMailbox(): Record<string, (raw: string) => void> {
  window.__wtaNativeHttpPending ??= {};
  window.__wtaNativeHttpResponse ??= (id, raw) => {
    const settle = window.__wtaNativeHttpPending?.[id];
    if (!settle) return;
    delete window.__wtaNativeHttpPending?.[id];
    settle(raw);
  };
  return window.__wtaNativeHttpPending;
}

function parseHttpReply(raw: string): NativeHttpResult {
  let reply: BridgeHttpReply;
  try {
    reply = JSON.parse(raw || "{}") as BridgeHttpReply;
  } catch {
    throw new NativeHttpError("原生网络桥返回了无法解析的数据");
  }
  if (!reply.ok) {
    throw new NativeHttpError(reply.message || reply.error || "原生网络桥请求失败");
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(reply.headers ?? {})) {
    headers[key.toLowerCase()] = String(value);
  }
  return {
    status: Number(reply.status || 0),
    statusText: String(reply.statusText || ""),
    headers,
    text: base64ToText(String(reply.bodyBase64 || "")),
  };
}

/** Send an HTTP request through NativeBridge.httpRequestAsync (no CORS check). */
export function nativeHttpRequest(
  options: NativeHttpRequest,
  timeoutMs = 30000,
): Promise<NativeHttpResult> {
  const bridge = getBridge();
  const call = bridge?.httpRequestAsync;
  if (!bridge || typeof call !== "function") {
    return Promise.reject(new NativeHttpError("原生网络桥不可用"));
  }

  const pending = httpMailbox();
  const id = `h${(httpSeq += 1)}_${Date.now()}`;
  const payload = JSON.stringify({
    url: options.url,
    method: options.method.toUpperCase(),
    headers: options.headers ?? {},
    bodyBase64: options.body ? textToBase64(options.body) : "",
  });

  return new Promise<NativeHttpResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      delete pending[id];
      action();
    };

    timer = setTimeout(() => {
      finish(() => reject(new NativeHttpError("系统接口请求超时", true)));
    }, timeoutMs);

    pending[id] = (raw) => {
      let reply: NativeHttpResult;
      try {
        reply = parseHttpReply(raw);
      } catch (e) {
        finish(() => reject(e));
        return;
      }
      finish(() => resolve(reply));
    };

    try {
      Reflect.apply(call, bridge, [payload, id]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      finish(() => reject(new NativeHttpError(message)));
    }
  });
}
