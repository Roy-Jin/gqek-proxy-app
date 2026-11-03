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
  proxies: readonly string[];
  enabled?: boolean;
  /** Proxy remembered from the previous download; checked first. */
  preferredProxy?: string;
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

/** Probe every proxy at the same time; results follow the input priority order. */
export async function probeProxiesConcurrently(
  proxies: readonly string[],
  targetUrl: string,
  options: ProbeOptions = {}
): Promise<ProxyProbeResult[]> {
  const tasks = proxies.map((proxy) =>
    probeProxy(proxy, targetUrl, options).catch(() => null)
  );
  const results = await Promise.all(tasks);
  return results.filter((result): result is ProxyProbeResult => result !== null);
}

/** Resolve as soon as one probe succeeds and abort the rest; null when none works. */
function raceFirstAvailable(
  proxies: readonly string[],
  targetUrl: string,
  options: ProbeOptions
): Promise<ProxyProbeResult | null> {
  if (proxies.length === 0) return Promise.resolve(null);
  if (options.signal?.aborted) return Promise.resolve(null);

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  return new Promise<ProxyProbeResult | null>((resolve) => {
    let remaining = proxies.length;
    let settled = false;

    const settle = (winner: ProxyProbeResult | null) => {
      if (settled) return;
      settled = true;
      if (winner) controller.abort();
      resolve(winner);
    };

    for (const proxy of proxies) {
      probeProxy(proxy, targetUrl, { ...options, signal: controller.signal })
        .then((result) => {
          if (result.status === "available") settle(result);
          else if (--remaining === 0) settle(null);
        })
        .catch(() => {
          if (--remaining === 0) settle(null);
        });
    }
  }).finally(() => options.signal?.removeEventListener("abort", onAbort));
}

/**
 * Remembered proxy first (single probe). If it fails, race the remaining eligible
 * proxies and take the fastest. All failures fall back to the original URL.
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
  if (eligible.length === 0) return { url: targetUrl, viaProxy: false };

  const preferred = options.preferredProxy;
  const checked: string[] = [];
  if (preferred && eligible.includes(preferred)) {
    const result = await probeProxy(preferred, targetUrl, options);
    if (result.status === "available") {
      return { url: result.url, proxy: preferred, viaProxy: true };
    }
    checked.push(preferred);
  }

  const remaining = eligible.filter((proxy) => !checked.includes(proxy));
  const winner = await raceFirstAvailable(remaining, targetUrl, options);
  if (winner) {
    return { url: winner.url, proxy: winner.proxy, viaProxy: true };
  }
  return { url: targetUrl, viaProxy: false };
}
