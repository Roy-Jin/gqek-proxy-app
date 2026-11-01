/**
 * Local API smoke tests (Node.js, no CORS limits).
 * Usage: pnpm test:api
 * Token: set API_TOKEN env var if the endpoint requires auth.
 */

import { listTodoApp } from "../src/api/index.js";
import type { RequestResult } from "../src/utils/request.js";

/** Hardcoded test token; API_TOKEN env var takes precedence */
const FALLBACK_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiIxOjE5NzcyNTYyOTU0NTM0NzA3MjgiLCJyblN0ciI6IlN4cHdBM2pVR2IwT0o4Um1aRkFaaHJrZVBINlhvclFrIiwidXNlcklkIjoxOTc3MjU2Mjk1NDUzNDcwNzI4fQ.U8KvlYMiE1gMQnlxwDLem-_ZZtnCWOhguwUypYHidfM";

const token = process.env.API_TOKEN ?? FALLBACK_TOKEN;

let failures = 0;

async function runCase(
  name: string,
  fn: () => Promise<RequestResult<unknown>>
): Promise<void> {
  const start = performance.now();
  let res: RequestResult<unknown> | undefined;
  try {
    res = await fn();
    const ms = Math.round(performance.now() - start);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = res.data as { code?: number; msg?: string } | null;
    if (body && typeof body === "object" && typeof body.code === "number" && body.code !== 200) {
      throw new Error(`business code ${body.code}: ${body.msg ?? ""}`);
    }
    console.log(`\n[PASS] ${name} - HTTP ${res.status} (${ms} ms)`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    failures++;
    const ms = Math.round(performance.now() - start);
    console.error(`\n[FAIL] ${name} (${ms} ms)`);
    console.error(e instanceof Error ? e.message : String(e));
    if (res) console.error(JSON.stringify(res.data, null, 2));
  }
}

async function main(): Promise<void> {
  console.log(
    `Token source: ${process.env.API_TOKEN ? "API_TOKEN env" : "hardcoded fallback"}`
  );

  // Probe messageStatus variants to find the correct filter values
  for (const status of [undefined, 1, 0, 2, 3] as const) {
    await runCase(`GET todolistApp messageStatus=${status}`, async () => {
      const res = await listTodoApp(
        { pageSize: 1, pageNum: 1, platform: 1, messageStatus: status },
        token ? { token } : undefined
      );
      const body = res.data as { total?: number; rows?: { messageStatus?: number }[] };
      console.log(`  -> total=${body?.total}, first row status=${body?.rows?.[0]?.messageStatus}`);
      return res;
    });
  }

  console.log(
    failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) failed.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main();
