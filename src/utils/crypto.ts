/**
 * 纯净加解密模块（Web / ESM）
 */

import CryptoJS from "crypto-js";
import { JSEncrypt } from "jsencrypt";

/* ======================= 常量 ======================= */

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const AES_KEY_LEN = 32;
const AES_BLOCK_LEN = 16;

export interface FixedCbc {
  readonly key: string;
  readonly iv: string;
}

export const FIXED_CBC: FixedCbc = Object.freeze({
  key: "7t4k7fuicte66zqaue1kbl0vf13lfwwt",
  iv: "1342581267345768",
});

export const RSA_PUBLIC_KEY_BASE64 =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmPffUpxZgfuSjYy3McBNyKmY9aRTY99hzRhiWqAU5Lj/bYYGnflwODnw7wkde4ypbq/2bXw2/BafmT4cMKvKyoMhezKVd5friYRQVv1d+JIBos649uuKiZEeu+RVfQwV9i7HfzJngMv2fE9TlvfvvNBpQzxyqZmMgGT0Zl319ZwIDAQAB";

const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${RSA_PUBLIC_KEY_BASE64.match(
  /.{1,64}/g
)!.join("\n")}\n-----END PUBLIC KEY-----`;

const ECB_OPTS = Object.freeze({
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7,
});

/* ======================= 内部工具 ======================= */

function getCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("当前环境不支持 Web Crypto API");
  }
  return c;
}

function assertAesKey(key: unknown): asserts key is string {
  if (typeof key !== "string" || key.length !== AES_KEY_LEN) {
    throw new Error(`AES-256 需要 ${AES_KEY_LEN} 字节 key`);
  }
}

function cbcOptions(key: string, iv: string) {
  assertAesKey(key);
  if (typeof iv !== "string" || iv.length !== AES_BLOCK_LEN) {
    throw new Error(`AES-CBC 需要 ${AES_BLOCK_LEN} 字节 IV`);
  }
  return {
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  };
}

/* =================== 1. 随机 AES key =================== */

/**
 * 使用 Web Crypto 生成密码学安全的 32 位 [A-Za-z0-9] key。
 * 拒绝采样避免 256 % 62 的取模偏差。
 */
export function generateAesKey(): string {
  const c = getCrypto();
  const limit = 256 - (256 % CHARS.length); // 248
  let out = "";
  while (out.length < AES_KEY_LEN) {
    const buf = new Uint8Array(AES_KEY_LEN * 2);
    c.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < AES_KEY_LEN; i++) {
      const b = buf[i]!;
      if (b < limit) out += CHARS.charAt(b % CHARS.length);
    }
  }
  return out;
}

/* =================== 2. Base64 工具 =================== */

export function encryptBase64(s: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(s));
}

export function decryptBase64(b64: string): string {
  return CryptoJS.enc.Base64.parse(b64).toString(CryptoJS.enc.Utf8);
}

/* ============== 3. AES-256-ECB-PKCS7 ============== */

export function aesEcbEncrypt(plain: string, keyStr: string): string {
  assertAesKey(keyStr);
  return CryptoJS.AES.encrypt(
    plain,
    CryptoJS.enc.Utf8.parse(keyStr),
    ECB_OPTS
  ).toString();
}

export function aesEcbDecrypt(cipherBase64: string, keyStr: string): string {
  assertAesKey(keyStr);
  return CryptoJS.AES.decrypt(
    cipherBase64,
    CryptoJS.enc.Utf8.parse(keyStr),
    ECB_OPTS
  ).toString(CryptoJS.enc.Utf8);
}

/* ============== 4. AES-256-CBC-PKCS7 ============== */

export function aesCbcEncrypt(
  plain: string,
  key: string = FIXED_CBC.key,
  iv: string = FIXED_CBC.iv
): string {
  return CryptoJS.AES.encrypt(
    plain,
    CryptoJS.enc.Utf8.parse(key),
    cbcOptions(key, iv)
  ).toString();
}

export function aesCbcDecrypt(
  cipherBase64: string,
  key: string = FIXED_CBC.key,
  iv: string = FIXED_CBC.iv
): string {
  return CryptoJS.AES.decrypt(
    cipherBase64,
    CryptoJS.enc.Utf8.parse(key),
    cbcOptions(key, iv)
  ).toString(CryptoJS.enc.Utf8);
}

/* =================== 5. RSA 公钥加密 =================== */

let _rsaPublic: JSEncrypt | null = null;

function getRsaPublic(): JSEncrypt {
  if (!_rsaPublic) {
    _rsaPublic = new JSEncrypt();
    _rsaPublic.setPublicKey(RSA_PUBLIC_KEY_PEM);
  }
  return _rsaPublic;
}

export function rsaEncrypt(plain: string): string {
  const out = getRsaPublic().encrypt(plain);
  if (!out) throw new Error("RSA 加密失败");
  return out;
}

/* =================== 6. 摘要 =================== */

export function md5(s: string): string {
  return CryptoJS.MD5(s).toString();
}

export function sha256(s: string): string {
  return CryptoJS.SHA256(s).toString();
}

/* =================== 7. 业务封装 =================== */

export function buildEncryptFlag(aesKey: string): string {
  return rsaEncrypt(encryptBase64(aesKey));
}

export function axiosDecrypt(data: unknown): unknown {
  if (!data) return data;
  try {
    return JSON.parse(aesCbcDecrypt(String(data)));
  } catch {
    return data;
  }
}