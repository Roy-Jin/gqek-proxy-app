import { http } from "../client.js";
import type { PagedResult } from "../types.js";
import type { RequestOptions } from "../../utils/request.js";

/** Todo list query params */
export interface TodoListParams {
  /** Page size */
  pageSize: number;
  /** Page number */
  pageNum: number;
  /** 1 = todo, 2 = done (matches the record field enum) */
  messageStatus?: number;
  /** Title fuzzy search */
  messageTitle?: string;
  /** Platform flag */
  platform: number;
  [key: string]: unknown;
}

/** Todo message entry */
export interface TodoMessage {
  id: string;
  schoolId: number;
  fromUserId: string;
  fromUserName: string;
  businessId: string;
  messageType: number;
  messageBusinessType: number;
  messageTitle: string;
  messageContent: string;
  userId: string;
  /** Record status (differs from query param): observed 2 on a done item */
  messageStatus: number;
  link: string;
  createTime: string;
  [key: string]: unknown;
}

/** Paged response of todolistApp (flat, uses rows) */
export type TodoListResult = PagedResult<TodoMessage>;

/**
 * Get my todo message list
 * GET /message/message/todolistApp
 */
export function listTodoApp(params: TodoListParams, opts?: RequestOptions) {
  return http.get<TodoListResult>("/message/message/todolistApp", params, opts);
}
