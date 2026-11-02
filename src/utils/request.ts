/**
 * 请求封装（原生 fetch + Promise）
 */

import {
  generateAesKey,
  buildEncryptFlag,
  aesEcbEncrypt,
  aesEcbDecrypt,
  md5,
  rsaEncrypt,
  axiosDecrypt,
} from "./crypto.js";

/* ==================== 类型 ==================== */

type HeaderValue = string | boolean | undefined;
type HeadersRecord = Record<string, HeaderValue>;

export interface RequestOptions {
  baseUrl?: string;
  url?: string;
  method?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  token?: string;
  getToken?: () => string | null | undefined;
  headers?: HeadersRecord;
  isToken?: boolean;
  /** true 时跳过加密（与原语义保持一致） */
  isEncrypt?: boolean;
  timeout?: number;
  timestampDifference?: number;
}

export interface RequestResult<T = unknown> {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  data: T;
  raw: string;
}

export interface CreateClientDefaults {
  baseUrl?: string;
  token?: string;
  getToken?: () => string | null | undefined;
  headers?: HeadersRecord;
  timeout?: number;
}

/* ==================== 工具函数 ==================== */

/** 对应原 g.tansParams：返回 "k=v&k=v&"（末尾带 &），跳过 undefined/null */
function tansParams(obj: Record<string, unknown>): string {
  let s = "";
  for (const k in obj) {
    const v = obj[k];
    if (v === undefined || v === null) continue;
    s += `${k}=${v}&`;
  }
  return s;
}

/** 对应原 r(url)：取最后一个 ? 后的 query，+ 还原空格，值含 % 才 decode */
function parseQuery(url: string): string[] {
  const out: string[] = [];
  const idx = url.lastIndexOf("?");
  if (idx === -1) return out;
  const q = url.substring(idx + 1).replace(/\+/g, " ");
  for (const t of q.split("&")) {
    if (!t) continue;
    const eq = t.indexOf("=");
    let k = t;
    let v = "";
    if (eq > -1) {
      k = t.substring(0, eq);
      v = t.substring(eq + 1);
    }
    if (v && v.indexOf("%") > -1) {
      try {
        v = decodeURIComponent(v);
      } catch {
        /* ignore */
      }
    }
    out.push(`${k}=${v}`);
  }
  return out;
}

/** 将内部 header 记录（可能含 boolean）转为 fetch 需要的 string 记录 */
function toStringHeaders(h: HeadersRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k in h) {
    const v = h[k];
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

/* ==================== 核心请求 ==================== */

export async function request<T = unknown>(
  options: RequestOptions = {}
): Promise<RequestResult<T>> {
  const {
    baseUrl = "",
    url = "",
    method = "get",
    params,
    data,
    token,
    getToken,
    headers = {},
    isToken = true,
    isEncrypt,
    timeout = 30000,
    timestampDifference = 0,
  } = options;

  const httpMethod = String(method).toLowerCase();
  const needEncrypt = typeof isEncrypt === "undefined" || !isEncrypt;

  /* ---------- 1. 准备 header ---------- */

  const finalHeaders: HeadersRecord = { ...headers };

  // isToken 可能挂在 headers 上（原源码用 e.headers.isToken 判断）
  const tokenFlag = finalHeaders.isToken === false ? false : isToken;
  delete finalHeaders.isToken;

  // 生成 AES key + encrypt-flag
  let aesKey: string | null = null;
  if (needEncrypt) {
    aesKey = generateAesKey();
    finalHeaders["encrypt-flag"] = buildEncryptFlag(aesKey);
  }

  // Explicit token wins so scripts without an active pinia store can authenticate.
  const realToken = token || (typeof getToken === "function" ? getToken() : undefined);
  if (tokenFlag && realToken) {
    finalHeaders["Authorization"] = "Bearer " + realToken;
  }

  /* ---------- 2. 处理 URL / body ---------- */

  let reqUrl = url;
  let reqBody: BodyInit | undefined;

  if (httpMethod === "get") {
    // GET：params 或 data 二选一，整体加密成 ?params=密文
    const source = (params ?? data) as
      | Record<string, unknown>
      | null
      | undefined;
    if (source && typeof source === "object" && Object.keys(source).length > 0) {
      const plainQuery = tansParams(source).slice(0, -1);
      let cipher: string;
      if (needEncrypt) {
        cipher = aesEcbEncrypt(plainQuery, aesKey!).replace(/\+/g, "%2B");
      } else {
        cipher = plainQuery;
      }
      reqUrl = url + "?params=" + cipher;
    }
  } else {
    // 非 GET：
    //   - params 拼到 URL（不加密，与源码一致）
    //   - data 加密成 body
    if (params && Object.keys(params).length > 0) {
      const q = tansParams(params).slice(0, -1);
      reqUrl = url + (url.includes("?") ? "&" : "?") + q;
    }

    if (data !== undefined && data !== null) {
      let v: unknown;
      if (
        typeof data === "object" &&
        !(typeof FormData !== "undefined" && data instanceof FormData)
      ) {
        v = JSON.stringify(data);
      } else {
        v = data;
      }

      if (needEncrypt) {
        reqBody = aesEcbEncrypt(String(v), aesKey!);
      } else {
        reqBody = v as BodyInit;
      }

      if (!finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json;charset=UTF-8";
      }
    }
  }

  /* ---------- 3. 签名 ---------- */

  const a: string[] = [];
  if (reqUrl.indexOf("?") > -1) a.push(...parseQuery(reqUrl));
  if (httpMethod !== "get" && reqBody != null) {
    a.push(JSON.stringify(reqBody));
  }
  a.sort();

  const md5Input = encodeURIComponent(a.join("&"));
  const f = md5(md5Input);
  const ts = Date.now() - timestampDifference;
  const y = f + "|" + ts;
  finalHeaders["Signature"] = rsaEncrypt(y);

  /* ---------- 4. 发送 ---------- */

  console.log(`[http] ${httpMethod.toUpperCase()} ${reqUrl}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let resp: Response;
  try {
    resp = await fetch(baseUrl + reqUrl, {
      method: httpMethod.toUpperCase(),
      headers: toStringHeaders(finalHeaders),
      body: reqBody,
      signal: controller.signal,
    });
  } catch (e: unknown) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("系统接口请求超时");
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error("后端接口连接异常: " + msg);
  }
  clearTimeout(timer);

  /* ---------- 5. 响应解密 ---------- */

  const raw = await resp.text();
  console.log(`[http] ${resp.status} ${httpMethod.toUpperCase()} ${reqUrl}`);
  const encHeader = resp.headers.get("encrypt-response");
  const encryptedResponse =
    String(encHeader || "").toLowerCase() === "true";

  let decoded: string = raw;
  if (aesKey && encryptedResponse && raw) {
    try {
      decoded = aesEcbDecrypt(raw, aesKey);
    } catch {
      // 解密失败保留原文
    }
  }

  let body: unknown;
  try {
    body = typeof decoded === "string" ? JSON.parse(decoded) : decoded;
  } catch {
    body = decoded;
  }

  // 固定 key/iv 的 AES-CBC 二次处理
  body = axiosDecrypt(body);

  /* ---------- 6. 返回 ---------- */

  const respHeaders: Record<string, string> = {};
  resp.headers.forEach((value, key) => {
    respHeaders[key] = value;
  });

  return {
    ok: resp.ok,
    status: resp.status,
    headers: respHeaders,
    data: body as T,
    raw,
  };
}

/* ==================== 便捷客户端 ==================== */

export function createClient(defaults: CreateClientDefaults = {}) {
  const merged = (opts: RequestOptions): RequestOptions => {
    const headers: HeadersRecord = {
      ...(defaults.headers || {}),
      ...(opts.headers || {}),
    };
    return { ...defaults, ...opts, headers };
  };

  return {
    request: <T = unknown>(opts: RequestOptions = {}) =>
      request<T>(merged(opts)),

    get: <T = unknown>(
      url: string,
      params?: Record<string, unknown>,
      opts: RequestOptions = {}
    ) => request<T>(merged({ ...opts, method: "get", url, params })),

    post: <T = unknown>(
      url: string,
      data?: unknown,
      opts: RequestOptions = {}
    ) => request<T>(merged({ ...opts, method: "post", url, data })),

    put: <T = unknown>(
      url: string,
      data?: unknown,
      opts: RequestOptions = {}
    ) => request<T>(merged({ ...opts, method: "put", url, data })),

    delete: <T = unknown>(
      url: string,
      data?: unknown,
      opts: RequestOptions = {}
    ) => request<T>(merged({ ...opts, method: "delete", url, data })),
  };
}

export default request;