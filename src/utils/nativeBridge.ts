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
