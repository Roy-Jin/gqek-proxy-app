import { http } from "../client.js";
import type { ApiResult } from "../types.js";
import type { RequestOptions } from "../../utils/request.js";

/* ==================== Student search ==================== */

/** Student search params for member picking */
export interface StudentSearchParams {
  schoolId: string | number;
  /** Name or student number */
  nameOrNo: string;
  /** 1 = student */
  userType: number;
  [key: string]: unknown;
}

/** Student entry returned by the search endpoint */
export interface StudentUser {
  userId: string;
  userName: string;
  nickName: string;
  className: string | null;
  collegeName: string | null;
  majorName: string | null;
  avatarUrl: string | null;
  /** "王晋-251581139(学生)" */
  userNameAndNickName: string | null;
  [key: string]: unknown;
}

/**
 * Search students by name or student number
 * POST /qualityexpansion/blacklist/studentList
 */
export function searchStudents(params: StudentSearchParams, opts?: RequestOptions) {
  return http.post<ApiResult<StudentUser[]>>(
    "/qualityexpansion/blacklist/studentList",
    params,
    opts
  );
}
