import { aesCbcDecrypt, aesCbcEncrypt, md5 } from "./crypto.js";

/**
 * Shareable temp key: `GQKT1.` + base64url(AES-CBC payload).
 * This is obfuscation for casual sharing only, not a security mechanism.
 */
export const TEMP_KEY_PREFIX = "GQKT1.";
export const TEMP_KEY_TTL_MS = 10 * 60 * 1000;

// Salt for the lightweight integrity check; keep in sync with the payload format.
const SIGN_SALT = "gqek-temp-key-v1";
const SIGN_LENGTH = 16;

interface TempKeyPayload {
  /** Original session token */
  t: string;
  /** Expiry timestamp in ms */
  e: number;
  /** Integrity check */
  s: string;
}

export interface TempKeyInfo {
  key: string;
  expiresAt: number;
}

export type TempKeyParseResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; message: string };

function signature(token: string, expiresAt: number): string {
  return md5(`${token}|${expiresAt}|${SIGN_SALT}`).slice(0, SIGN_LENGTH);
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const rest = b64.length % 4;
  return rest === 0 ? b64 : b64 + "=".repeat(4 - rest);
}

/** True when the pasted key carries the temp-key prefix; normal tokens never match. */
export function isTempKey(value: string): boolean {
  return value.trim().startsWith(TEMP_KEY_PREFIX);
}

export function createTempKey(token: string, ttlMs: number = TEMP_KEY_TTL_MS): TempKeyInfo {
  if (!token) throw new Error("当前没有可分享的密钥");
  const expiresAt = Date.now() + ttlMs;
  const payload: TempKeyPayload = {
    t: token,
    e: expiresAt,
    s: signature(token, expiresAt),
  };
  const encoded = toBase64Url(aesCbcEncrypt(JSON.stringify(payload)));
  return { key: TEMP_KEY_PREFIX + encoded, expiresAt };
}

export function parseTempKey(input: string, now: number = Date.now()): TempKeyParseResult {
  const raw = input.trim();
  if (!raw.startsWith(TEMP_KEY_PREFIX)) {
    return { ok: false, message: "临时密钥格式不正确" };
  }

  const encoded = raw.slice(TEMP_KEY_PREFIX.length);
  if (!encoded) {
    return { ok: false, message: "临时密钥内容为空" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(aesCbcDecrypt(fromBase64Url(encoded)));
  } catch {
    return { ok: false, message: "临时密钥已损坏，请确认已完整复制" };
  }

  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "临时密钥已损坏，请确认已完整复制" };
  }

  const { t, e, s } = payload as Partial<TempKeyPayload>;
  if (
    typeof t !== "string" ||
    !t ||
    typeof e !== "number" ||
    !Number.isFinite(e) ||
    typeof s !== "string"
  ) {
    return { ok: false, message: "临时密钥已损坏，请确认已完整复制" };
  }

  if (s !== signature(t, e)) {
    return { ok: false, message: "临时密钥校验失败，可能已被篡改" };
  }

  if (now >= e) {
    return { ok: false, message: "临时密钥已过期，请向分享者重新获取" };
  }

  return { ok: true, token: t, expiresAt: e };
}
