import { http } from "../client.js";
import type { RequestOptions } from "../../utils/request.js";

/** Team list query params */
export interface TeamListParams {
  pageSize: number;
  pageNum: number;
  [key: string]: unknown;
}

/** Team entry from /system/team/list */
export interface TeamInfo {
  teamId: string;
  schoolId: number;
  teamName: string;
  teamProfile: string;
  teamAdvantage: string;
  teamAvatar: string | null;
  teamStatus: number;
  teamNum: number;
  teamTime: string;
  teamCreationId: string;
  teamCreationName: string | null;
  teamUpdateTime: string;
  teamUpdateId: string;
  memberFlag: number;
  tramMemberList: unknown;
  teamUserNo: string | null;
  status: number | null;
  serviceTime: string | null;
  teamUserName: string | null;
  [key: string]: unknown;
}

/** Paged response of /system/team/list (flat, uses rows) */
export interface TeamListResult {
  code: number;
  msg: string;
  total: number;
  rows: TeamInfo[];
  [key: string]: unknown;
}

/**
 * Get team list
 * GET /system/team/list
 */
export function listTeam(params: TeamListParams, opts?: RequestOptions) {
  return http.get<TeamListResult>("/system/team/list", params, opts);
}