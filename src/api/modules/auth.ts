import { http } from "../client.js";
import type { RequestOptions } from "../../utils/request.js";

/* ==================== Types ==================== */

/** Captcha response payload */
export interface CaptchaResult {
  code: number;
  msg: string;
  data: {
    /** Base64 image, needs "data:image/gif;base64," prefix */
    img: string;
    uuid: string;
  };
  [key: string]: unknown;
}

/** SMS captcha request params */
export interface CaptchaSmsParams {
  phonenumber: string;
  flag: string | number;
  type: string | number;
  [key: string]: unknown;
}

/** SMS captcha confirm params */
export interface CaptchaSmsConfirmParams {
  phonenumber: string;
  code: string;
  [key: string]: unknown;
}

/** Account login request body */
export interface LoginParams {
  username: string;
  password: string;
  /** Captcha code */
  code: string;
  /** Captcha uuid */
  uuid: string;
  schoolId: string;
  [key: string]: unknown;
}

/** SMS login request body */
export interface SmsLoginParams {
  phonenumber: string;
  code: string;
  [key: string]: unknown;
}

/** Login response payload */
export interface LoginResult {
  code: number;
  msg: string;
  data: {
    token: string;
  };
  [key: string]: unknown;
}

/** Current user profile from getInfo */
export interface UserInfo {
  userId: number | string;
  userName: string;
  nickName: string;
  className: string;
  avatar: string | null;
  schoolId: number | string;
  schoolName: string;
  status: string | number;
  [key: string]: unknown;
}

/** getInfo response payload */
export interface InfoResult {
  code: number;
  msg: string;
  data: {
    user: UserInfo;
  };
  roles: string[];
  permissions: string[];
  [key: string]: unknown;
}

/** Generic payload for endpoints returning only code/msg */
export interface BasicResult {
  code: number;
  msg: string;
  data?: unknown;
  [key: string]: unknown;
}

/* ==================== Captcha ==================== */

/**
 * Get image captcha
 * GET /captchaImage
 */
export function getCaptchaImage(opts?: RequestOptions) {
  return http.get<CaptchaResult>("/captchaImage", undefined, {
    isToken: false,
    timeout: 20000,
    ...opts,
  });
}

/**
 * Get SMS captcha
 * GET /captchaSms
 */
export function getCaptchaSms(params: CaptchaSmsParams, opts?: RequestOptions) {
  return http.get<BasicResult>("/captchaSms", params, {
    isToken: false,
    timeout: 20000,
    ...opts,
  });
}

/**
 * Confirm SMS captcha code
 * GET /captchaSmsConfirm
 */
export function confirmCaptchaSms(
  params: CaptchaSmsConfirmParams,
  opts?: RequestOptions
) {
  return http.get<BasicResult>("/captchaSmsConfirm", params, {
    isToken: false,
    timeout: 20000,
    ...opts,
  });
}

/* ==================== Login ==================== */

/**
 * Account login
 * POST /app/login
 */
export function appLogin(data: LoginParams, opts?: RequestOptions) {
  return http.post<LoginResult>("/app/login", data, { isToken: false, ...opts });
}

/**
 * SMS login
 * POST /smsLogin
 */
export function smsLogin(data: SmsLoginParams, opts?: RequestOptions) {
  return http.post<LoginResult>("/smsLogin", data, { isToken: false, ...opts });
}

/**
 * SSO: exchange an external userToken for a session (query params, not body).
 * Not usable for validating the app's own token.
 * POST /appSchoolLoginByToken
 */
export function appSchoolLoginByToken(userToken: string, opts?: RequestOptions) {
  return http.post<BasicResult>("/appSchoolLoginByToken", undefined, {
    ...opts,
    params: { userToken },
  });
}

/**
 * Get user info by token (query params, not body)
 * POST /loginByToken
 */
export function getUserSingleInfo(token: string, opts?: RequestOptions) {
  return http.post<BasicResult>("/loginByToken", undefined, {
    ...opts,
    params: { token },
  });
}

/* ==================== Session ==================== */

/**
 * Get current user info; doubles as saved-token validation
 * GET /getInfo
 */
export function getInfo(opts?: RequestOptions) {
  return http.get<InfoResult>("/getInfo", undefined, opts);
}

/**
 * Logout
 * POST /logout
 */
export function logout(opts?: RequestOptions) {
  return http.post<BasicResult>("/logout", undefined, opts);
}
