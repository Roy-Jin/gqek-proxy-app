/**
 * Probe activity list ownership.
 * Usage: $env:API_TOKEN="<jwt>"; pnpm probe:activity
 * The token is read from env only and is never written to disk or printed.
 */

import { getInfo, http } from "../src/api/index.js";

const token: string = process.env.API_TOKEN?.trim() ?? "";
if (!token) {
  console.error("API_TOKEN env is required");
  process.exit(1);
}

const auth = { token };

interface ListBody {
  code?: number;
  msg?: string;
  total?: number;
  rows?: Record<string, unknown>[];
  [key: string]: unknown;
}

function jwtPayload(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Extract userId as raw digits; JSON.parse would lose precision above 2^53. */
function jwtUserId(jwt: string): string | null {
  const json = jwtPayload(jwt);
  if (!json) return null;
  const match = /"userId"\s*:\s*"?(?<id>\d+)"?/.exec(json);
  return match?.groups?.id ?? null;
}

/** Print claim names and exp only; values stay out of logs. */
function jwtClaims(jwt: string): string {
  const json = jwtPayload(jwt);
  if (!json) return "unable to decode payload";
  const names = [...json.matchAll(/"([A-Za-z0-9_]+)"\s*:/g)].map((m) => m[1]);
  const exp = /"exp"\s*:\s*(\d+)/.exec(json);
  return `claims=[${names.join(",")}] exp=${exp ? exp[1] : "absent"}`;
}

async function collect(
  path: string,
  baseParams: Record<string, unknown>,
  maxPages = 3
): Promise<{
  total: number;
  rows: Record<string, unknown>[];
  statuses: number[];
  codes: (number | undefined)[];
}> {
  const rows: Record<string, unknown>[] = [];
  const statuses: number[] = [];
  const codes: (number | undefined)[] = [];
  let total = 0;

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const res = await http.get<ListBody>(path, { ...baseParams, pageNum }, auth);
    const body = (res.data ?? {}) as ListBody;
    const pageRows = Array.isArray(body.rows) ? body.rows : [];
    statuses.push(res.status);
    codes.push(body.code);
    if (pageNum === 1) total = body.total ?? 0;
    rows.push(...pageRows);
    console.log(
      `  page ${pageNum}: HTTP ${res.status}, code ${body.code}, total ${body.total}, rows ${pageRows.length}`
    );
    if (pageRows.length === 0 || rows.length >= total) break;
  }

  return { total, rows, statuses, codes };
}

function report(
  label: string,
  path: string,
  params: Record<string, unknown>,
  result: Awaited<ReturnType<typeof collect>>,
  userId: string | null,
  userName: string | undefined
) {
  const { total, rows, statuses, codes } = result;
  const ids = rows.map((r) => String(r.activityId));
  const uniqueIds = new Set(ids);
  const duplicates = ids.length - uniqueIds.size;
  const createMatch = userId
    ? rows.filter((r) => String(r.createBy) === userId).length
    : 0;
  const studentMatch = userId
    ? rows.filter((r) => String(r.studentId) === userId).length
    : 0;
  const userMatch = userName
    ? rows.filter((r) => String(r.createBy) === userName).length
    : 0;
  const foreign = userId
    ? rows.filter((r) => String(r.createBy) !== userId)
    : [];
  const ownershipFields = [
    "orgId",
    "deptId",
    "orgName",
    "maintainerId",
    "createBy",
    "studentId",
    "schoolId",
    "schoolName",
  ];
  const valuesOf = (field: string) => [
    ...new Set(rows.map((r) => r[field])),
  ].slice(0, 10);
  const rowKeys = rows[0] ? Object.keys(rows[0]) : [];

  console.log(`\n## ${label}`);
  console.log(`path: ${path}`);
  console.log(`params: ${JSON.stringify(params)}`);
  console.log(
    `HTTP: ${statuses.join("/")}  code: ${codes.join("/")}  total: ${total}  collected: ${rows.length}  unique: ${uniqueIds.size}  duplicates: ${duplicates}`
  );
  console.log(
    `createBy==userId: ${createMatch}/${rows.length}  studentId==userId: ${studentMatch}/${rows.length}  createBy==userName: ${userMatch}/${rows.length}`
  );
  console.log(`row keys: ${rowKeys.join(",") || "(none)"}`);
  for (const field of ownershipFields) {
    console.log(`${field} values: ${JSON.stringify(valuesOf(field))}`);
  }
  if (rows[0]) {
    const sample: Record<string, unknown> = {};
    for (const field of ownershipFields) sample[field] = rows[0][field];
    console.log(`sample ownership: ${JSON.stringify(sample)}`);
  }
  console.log(`non-owner rows: ${foreign.length}`);
  if (foreign.length > 0) {
    console.log(
      JSON.stringify(
        foreign.slice(0, 5).map((r) => ({
          activityId: r.activityId,
          activityName: r.activityName,
          createBy: r.createBy,
          studentId: r.studentId,
          maintainerName: r.maintainerName,
        })),
        null,
        2
      )
    );
  }
  if (total !== 0 && rows.length < total) {
    console.log(`note: only collected ${rows.length}/${total} rows (page limit reached)`);
  }
}

async function main(): Promise<void> {
  const userId = jwtUserId(token);
  console.log("token source: API_TOKEN env (value hidden)");
  console.log(`token userId: ${userId ?? "unable to decode"}`);
  console.log(`token claims: ${jwtClaims(token)}`);
  if (!userId) {
    console.error("cannot extract userId from token payload; aborting");
    process.exit(1);
  }

  const infoRes = await getInfo(auth);
  const info = (infoRes.data ?? {}) as {
    code?: number;
    msg?: string;
    data?: { user?: Record<string, unknown> };
  };
  const user = info.data?.user ?? {};
  console.log(
    `\ngetInfo: HTTP ${infoRes.status}, code ${info.code}, msg ${info.msg}`
  );
  console.log(
    `user: userId=${user.userId}, userType=${user.userType}, userName=${user.userName}, schoolName=${user.schoolName}, deptId=${user.deptId}, orgId=${user.orgId}, orgName=${user.orgName}`
  );
  console.log(
    `roles=${Array.isArray(user.roles) ? user.roles.length : 0}, permissions=${Array.isArray(user.permissions) ? user.permissions.length : 0}`
  );
  if (info.code === 401) {
    console.log("note: a non-empty API_TOKEN still yielding 401 means the session is likely invalid.");
  }

  const pageSize = 50;
  const cases: {
    label: string;
    path: string;
    params: Record<string, unknown>;
  }[] = [
    {
      label: "volunteer type=1 (all)",
      path: "/activity/volunteer/myActivitiyInfoByStudent",
      params: { pageSize, type: 1, userId },
    },
    {
      label: "volunteer type=10 (created by me)",
      path: "/activity/volunteer/myActivitiyInfoByStudent",
      params: { pageSize, type: 10, userId },
    },
    {
      label: "sports type=1 (all)",
      path: "/activity/activityInfo/myActivitiyInfoByStudent",
      params: { pageSize, type: 1 },
    },
    {
      label: "sports type=10 (created by me)",
      path: "/activity/activityInfo/myActivitiyInfoByStudent",
      params: { pageSize, type: 10 },
    },
  ];

  for (const item of cases) {
    const result = await collect(item.path, item.params);
    report(item.label, item.path, item.params, result, userId, String(user.userName ?? ""));
  }

  for (const type of [1, 10]) {
    try {
      const result = await collect(
        "/activity/activityInfo/myActivitiyInfoByManage",
        { pageSize, type },
        1
      );
      report(
        `manage type=${type}`,
        "/activity/activityInfo/myActivitiyInfoByManage",
        { pageSize, type },
        result,
        userId,
        String(user.userName ?? "")
      );
    } catch (error) {
      console.log(
        `\nmanage type=${type}: request failed - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
