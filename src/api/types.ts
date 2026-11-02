/** Common envelope of backend responses. */
export interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data: T;
  [key: string]: unknown;
}

/** Flat paged list response (total + rows). */
export interface PagedResult<T> {
  code: number;
  msg: string;
  total: number;
  rows: T[];
  [key: string]: unknown;
}
