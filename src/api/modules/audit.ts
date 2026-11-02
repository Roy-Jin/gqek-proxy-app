import { http } from "../client.js";
import type { ApiResult } from "../types.js";
import type { RequestOptions } from "../../utils/request.js";

/** Audit request params */
export interface AuditParams {
  ids: string[];
  auditStatus: number;
  auditOption: string;
  [key: string]: unknown;
}

/** Audit response */
export type AuditResult = ApiResult;

/**
 * Approve / reject audit items
 * POST /audit/auditInfo/audit
 */
export function auditInfo(params: AuditParams, opts?: RequestOptions) {
  return http.post<AuditResult>("/audit/auditInfo/audit", params, opts);
}