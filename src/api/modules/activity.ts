import { http } from "../client.js";
import type { ApiResult, PagedResult } from "../types.js";
import type { RequestOptions } from "../../utils/request.js";

/* ==================== Activity status ==================== */

export const ACTIVITY_STATUS: Record<number, string> = {
  1: "待审核",
  2: "待报名",
  3: "正在报名",
  4: "待开始",
  5: "进行中",
  6: "等待完结",
  7: "完结审核",
  10: "已完结",
};

export function activityStatusLabel(status: number): string {
  return ACTIVITY_STATUS[status] ?? `状态 ${status}`;
}

/** My activity list query params */
export interface MyActivityParams {
  /** Page size */
  pageSize: number;
  /** Page number */
  pageNum: number;
  /** Activity type */
  type: number;
  [key: string]: unknown;
}

/** Activity entry from myActivitiyInfoByStudent */
export interface ActivityInfo {
  activityId: string;
  activityName: string;
  activityAvatarUrl: string | null;
  /** Organizer (hosting org) name */
  maintainerName: string;
  /** Hosting org id; used to filter activities to the current user's org */
  maintainerId: string | null;
  /** Creator user id */
  createBy: string | null;
  teacherName: string | null;
  activityClassifyName: string;
  activityLocation: string;
  /** Activity duration in hours, e.g. "0.5" */
  attendTime: string;
  memberNum: number;
  status: number;
  activityStartTime: string;
  activityEndTime: string;
  registerStartTime: string;
  registerEndTime: string;
  createTime: string;
  [key: string]: unknown;
}

/** Paged response of myActivitiyInfoByStudent (flat, uses rows) */
export type MyActivityResult = PagedResult<ActivityInfo>;

/**
 * Get my activity list by student
 * GET /activity/activityInfo/myActivitiyInfoByStudent
 */
export function listMyActivityByStudent(
  params: MyActivityParams,
  opts?: RequestOptions
) {
  return http.get<MyActivityResult>(
    "/activity/activityInfo/myActivitiyInfoByStudent",
    params,
    opts
  );
}

/* ==================== Volunteer activity ==================== */

/** Volunteer activity list query params */
export interface VolunteerActivityParams {
  pageSize: number;
  pageNum: number;
  type: number;
  userId: string;
  [key: string]: unknown;
}

/** Volunteer activity entry from volunteer/myActivitiyInfoByStudent */
export interface VolunteerActivityInfo {
  activityId: string;
  activityName: string;
  activityAvatarUrl: string | null;
  /** Organizer (hosting org) name */
  maintainerName: string;
  /** Hosting org id; used to filter activities to the current user's org */
  maintainerId: string | null;
  /** Creator user id */
  createBy: string | null;
  teacherName: string | null;
  activityClassifyName: string;
  activityLocation: string;
  attendTime: string | null;
  serviceTime: string | null;
  memberNum: number;
  status: number;
  activityStartTime: string;
  activityEndTime: string;
  [key: string]: unknown;
}

/** Paged response of volunteer/myActivitiyInfoByStudent (flat, uses rows) */
export type VolunteerActivityResult = PagedResult<VolunteerActivityInfo>;

/**
 * Get my volunteer activity list by student
 * GET /activity/volunteer/myActivitiyInfoByStudent
 */
export function listMyVolunteerActivityByStudent(
  params: VolunteerActivityParams,
  opts?: RequestOptions
) {
  return http.get<VolunteerActivityResult>(
    "/activity/volunteer/myActivitiyInfoByStudent",
    params,
    opts
  );
}

/* ==================== Activity detail ==================== */

/** Teacher entry inside activity detail */
export interface ActivityTeacherVo {
  teacherName: string | null;
  instructTime: string | null;
  instructLabel: string | null;
  [key: string]: unknown;
}

/** Class-hour entry inside activity detail */
export interface ActivityClassHour {
  attendTime: string | null;
  studentIdentity: string | null;
  activityName: string | null;
  [key: string]: unknown;
}

/** Registration limit info inside activity detail */
export interface ActivityLimitInfo {
  limitPeople: number | null;
  signUpType: string | null;
  signUpAudit: string | null;
  [key: string]: unknown;
}

/** Activity detail payload */
export interface ActivityDetail {
  activityId: string;
  activityName: string;
  maintainerName: string;
  studentName: string | null;
  studentPhone: string | null;
  activityClassifyName: string;
  activityLocation: string;
  attendTime: string | null;
  serviceTime: string | null;
  activityStartTime: string;
  activityEndTime: string;
  registerStartTime: string;
  registerEndTime: string;
  memberNum: number;
  status: number;
  activityAvatarUrl: string | null;
  activityAvatarImg: string | null;
  processName: string | null;
  fund: string | null;
  teacherName: string | null;
  content: string | null;
  purpose: string | null;
  activitiyTeacherVoList: ActivityTeacherVo[] | null;
  activitiyClassHourList: ActivityClassHour[] | null;
  activitiyLimitInfoVo: ActivityLimitInfo | null;
  signFlag: string | null;
  signOutFlag: string | null;
  checkinFlag: string | null;
  [key: string]: unknown;
}

/** Activity detail response (wrapped in data) */
export type ActivityDetailResult = ApiResult<ActivityDetail>;

/**
 * Get culture/sports activity detail
 * GET /activity/activityInfo/{activityId}
 */
export function getActivityDetail(activityId: string, opts?: RequestOptions) {
  return http.get<ActivityDetailResult>(
    `/activity/activityInfo/${activityId}`,
    undefined,
    opts
  );
}

/**
 * Get volunteer activity detail
 * GET /activity/volunteer/{activityId}
 */
export function getVolunteerActivityDetail(activityId: string, opts?: RequestOptions) {
  return http.get<ActivityDetailResult>(
    `/activity/volunteer/${activityId}`,
    undefined,
    opts
  );
}

/* ==================== Sign in / out ==================== */

/** Sign in / out toggle params */
export interface SignFlagChangeParams {
  activityId: string;
  signFlag: string;
  signOutFlag: string;
  [key: string]: unknown;
}

/** Sign in / out toggle response */
export type SignFlagChangeResult = ApiResult;

/**
 * Toggle activity sign-in / sign-out flags
 * POST /activity/activityInfo/signFlagChange
 */
export function signFlagChange(params: SignFlagChangeParams, opts?: RequestOptions) {
  return http.post<SignFlagChangeResult>(
    "/activity/activityInfo/signFlagChange",
    params,
    opts
  );
}

/* ==================== Member management / countersign ==================== */

/** Activity member list query params */
export interface MemberListParams {
  activityId: string;
  signFlag: string;
  userName: string;
  [key: string]: unknown;
}

/** Activity member entry */
export interface MemberInfo {
  memberId: string;
  studentId: string;
  studentName: string | null;
  userName: string | null;
  grade: string | null;
  collegeName: string | null;
  majorName: string | null;
  className: string | null;
  studentIdentity: string | null;
  status: string | null;
  signNum: number;
  signOutNum: number;
  avatarUrl: string | null;
  phone: string | null;
  [key: string]: unknown;
}

/** Paged response of performanceListForApp (flat, uses rows) */
export type MemberListResult = PagedResult<MemberInfo>;

/** Countersign (make-up sign) params */
export interface CountersignParams {
  activityId: string;
  signMode: string;
  signType: string;
  studentIds: string[];
  signFlag: number;
  [key: string]: unknown;
}

/**
 * Get activity member list
 * GET /activity/member/performanceListForApp
 */
export function listActivityMembers(params: MemberListParams, opts?: RequestOptions) {
  return http.get<MemberListResult>("/activity/member/performanceListForApp", params, opts);
}

/**
 * Make-up sign in / sign out for members
 * POST /activitiy/sign/countersign
 */
export function countersign(params: CountersignParams, opts?: RequestOptions) {
  return http.post<SignFlagChangeResult>("/activitiy/sign/countersign", params, opts);
}
