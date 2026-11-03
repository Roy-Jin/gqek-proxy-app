/**
 * GitHub download acceleration proxies: URL building and lightweight
 * connectivity probing. Pure functions only, so the store/composable decides
 * when to run them.
 */

export const DEFAULT_PROBE_TIMEOUT_MS = 4000;

export type ProxyProbeStatus = "available" | "unavailable" | "timeout" | "insecure";

export interface ProxyProbeResult {
  proxy: string;
  url: string;
  status: ProxyProbeStatus;
  durationMs: number;
  httpStatus?: number;
  reason?: string;
}

export interface ProbeOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Page protocol such as "https:"; defaults to window.location.protocol in a browser. */
  pageProtocol?: string;
}

export interface ProxySelectionOptions extends ProbeOptions {
  /** List order is the priority: ranked by measured download speed, first wins. */
  proxies: readonly string[];
  enabled?: boolean;
}

export interface DownloadUrlResult {
  url: string;
  proxy?: string;
  viaProxy: boolean;
}

class ProbeTimeoutError extends Error {}
class ProbeCanceledError extends Error {}
class ProbeStatusError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

/** Proxy prefix + original URL; slash handling keeps exactly one separator. */
export function buildProxyUrl(proxyPrefix: string, targetUrl: string): string {
  if (!proxyPrefix || !targetUrl) return targetUrl;
  const prefix = proxyPrefix.endsWith("/") ? proxyPrefix : `${proxyPrefix}/`;
  return prefix + targetUrl.replace(/^\/+/, "");
}

/** HTTPS pages cannot load an http:// proxy: mixed content is blocked by the browser. */
export function isMixedContentBlocked(proxyUrl: string, pageProtocol: string): boolean {
  return pageProtocol === "https:" && proxyUrl.startsWith("http://");
}

function isUsableStatus(status: number): boolean {
  return status >= 200 && status < 400;
}

function requestStatus(
  url: string,
  method: "HEAD" | "GET",
  headers: Record<string, string>,
  mode: RequestMode,
  signal: AbortSignal
): Promise<number> {
  return fetch(url, { method, headers, mode, signal, cache: "no-store", redirect: "follow" }).then(
    async (res) => {
      // Cancel any body immediately: a GET probe must not download the APK.
      try {
        await res.body?.cancel();
      } catch {
        /* body already discarded */
      }
      return res.status;
    }
  );
}

/**
 * HEAD first, then a ranged GET when HEAD is unsupported or blocked.
 * Opaque (no-cors) HEAD is the last resort when CORS hides the status entirely.
 */
async function attemptProbe(url: string, signal: AbortSignal): Promise<number> {
  let readableStatus: number | undefined;
  let lastError: unknown;

  try {
    const status = await requestStatus(url, "HEAD", {}, "cors", signal);
    if (isUsableStatus(status)) return status;
    readableStatus = status;
  } catch (e) {
    if (signal.aborted) throw e;
    lastError = e;
  }

  const retryWithGet =
    readableStatus === undefined ||
    readableStatus === 403 ||
    readableStatus === 405 ||
    readableStatus === 501;
  if (retryWithGet) {
    try {
      const status = await requestStatus(
        url,
        "GET",
        { Range: "bytes=0-1023" },
        "cors",
        signal
      );
      if (isUsableStatus(status)) return status;
      readableStatus = status;
    } catch (e) {
      if (signal.aborted) throw e;
      lastError = e;
    }
  }

  if (readableStatus === undefined) {
    try {
      // status 0 means the response is opaque but the host is reachable
      const status = await requestStatus(url, "HEAD", {}, "no-cors", signal);
      if (status === 0) return status;
    } catch (e) {
      if (signal.aborted) throw e;
      lastError = e;
    }
  }

  if (readableStatus !== undefined) throw new ProbeStatusError(readableStatus);
  throw lastError instanceof Error ? lastError : new Error("probe failed");
}

async function runProbe(url: string, options: ProbeOptions): Promise<number> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const controller = new AbortController();
  const external = options.signal;
  let timedOut = false;

  if (external?.aborted) throw new ProbeCanceledError();
  const onExternalAbort = () => controller.abort();
  external?.addEventListener("abort", onExternalAbort);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await attemptProbe(url, controller.signal);
  } catch (e) {
    if (external?.aborted) throw new ProbeCanceledError();
    if (timedOut) throw new ProbeTimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}

function resolvePageProtocol(options: ProbeOptions): string {
  if (options.pageProtocol !== undefined) return options.pageProtocol;
  return typeof window !== "undefined" ? window.location.protocol : "";
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Never throws except when the caller aborts; all failures map to a status. */
export async function probeProxy(
  proxy: string,
  targetUrl: string,
  options: ProbeOptions = {}
): Promise<ProxyProbeResult> {
  const url = buildProxyUrl(proxy, targetUrl);
  if (isMixedContentBlocked(url, resolvePageProtocol(options))) {
    return { proxy, url, status: "insecure", durationMs: 0 };
  }

  const startedAt = Date.now();
  try {
    const httpStatus = await runProbe(url, options);
    return { proxy, url, status: "available", durationMs: Date.now() - startedAt, httpStatus };
  } catch (e) {
    if (e instanceof ProbeCanceledError) throw e;
    if (e instanceof ProbeTimeoutError) {
      return { proxy, url, status: "timeout", durationMs: Date.now() - startedAt };
    }
    if (e instanceof ProbeStatusError) {
      return {
        proxy,
        url,
        status: "unavailable",
        durationMs: Date.now() - startedAt,
        httpStatus: e.status,
      };
    }
    return {
      proxy,
      url,
      status: "unavailable",
      durationMs: Date.now() - startedAt,
      reason: errorText(e),
    };
  }
}

/** Mixed-content rule for a proxy on the current page protocol. */
export function isProxyInsecure(
  proxy: string,
  targetUrl: string,
  pageProtocol: string
): boolean {
  return isMixedContentBlocked(buildProxyUrl(proxy, targetUrl), pageProtocol);
}

/**
 * Probe proxies one by one in list order and take the first available one.
 * Latency racing is skipped on purpose: a fast ping does not imply a fast
 * download, so the list order (ranked by measured download speed) decides.
 * All failures fall back to the original URL.
 */
export async function resolveDownloadUrl(
  targetUrl: string,
  options: ProxySelectionOptions
): Promise<DownloadUrlResult> {
  if (!options.enabled || !targetUrl || options.proxies.length === 0) {
    return { url: targetUrl, viaProxy: false };
  }

  const pageProtocol = resolvePageProtocol(options);
  const eligible = options.proxies.filter(
    (proxy) => !isProxyInsecure(proxy, targetUrl, pageProtocol)
  );

  for (const proxy of eligible) {
    if (options.signal?.aborted) break;
    try {
      const result = await probeProxy(proxy, targetUrl, options);
      if (result.status === "available") {
        return { url: result.url, proxy, viaProxy: true };
      }
    } catch {
      // Caller aborted mid-probe; stop and fall back.
      break;
    }
  }
  return { url: targetUrl, viaProxy: false };
}
