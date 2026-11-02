#!/usr/bin/env node
/**
 * Pack the built `dist/` into `dist/dist.zip` for WebToApp.
 *
 * The archive is written to a temp file outside `dist/` and moved in afterwards,
 * so the zip can never contain itself. Top-level entries stay flat
 * (`index.html`, `assets/...`) instead of nesting an extra `dist/` folder.
 *
 * Tool order: `zip` (Info-ZIP) -> `tar -a` (bsdtar) -> PowerShell `Compress-Archive` (Windows).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const zipName = "dist.zip";
const target = path.join(distDir, zipName);
const temp = path.join(os.tmpdir(), `gqek-build-${process.pid}-${zipName}`);

function fail(message) {
  console.error(`[build:zip] ${message}`);
  process.exit(1);
}

function removeTemp() {
  try {
    fs.rmSync(temp, { force: true });
  } catch {
    /* nothing to clean */
  }
}

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  fail("dist/index.html is missing; run `pnpm run build-only` first.");
}

const entries = fs
  .readdirSync(distDir)
  .filter((name) => name !== zipName)
  .sort();

if (!entries.length) fail("dist is empty; nothing to archive.");

removeTemp();

const attempts = [
  {
    name: "zip",
    run: () => execFileSync("zip", ["-r", "-q", temp, ...entries], { cwd: distDir, stdio: "pipe" }),
  },
  {
    name: "bsdtar",
    run: () => execFileSync("tar", ["-a", "-c", "-f", temp, ...entries], { cwd: distDir, stdio: "pipe" }),
  },
];

if (process.platform === "win32") {
  const quoted = entries.map((entry) => `'${entry.replace(/'/g, "''")}'`).join(",");
  const escapedTemp = temp.replace(/'/g, "''");
  attempts.push({
    name: "Compress-Archive",
    run: () =>
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Compress-Archive -Force -Path ${quoted} -DestinationPath '${escapedTemp}'`,
        ],
        { cwd: distDir, stdio: "pipe" }
      ),
  });
}

let usedTool = "";
const failures = [];

for (const attempt of attempts) {
  try {
    attempt.run();
    if (!fs.existsSync(temp) || fs.statSync(temp).size === 0) {
      throw new Error("archive was not created");
    }
    usedTool = attempt.name;
    break;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    failures.push(`${attempt.name}: ${reason.split("\n")[0]}`);
    removeTemp();
  }
}

if (!usedTool) {
  fail(
    [
      "No usable zip tool found.",
      "Windows: PowerShell Compress-Archive or bsdtar (tar.exe) is expected.",
      "Linux CI: install Info-ZIP (`apt-get install zip`) or extend this script with a zip library.",
      ...failures,
    ].join(" ")
  );
}

fs.copyFileSync(temp, target);
removeTemp();

const sizeKb = (fs.statSync(target).size / 1024).toFixed(1);
console.log(
  `[build:zip] ${path.relative(root, target)} created (${entries.length} top-level entries, ${sizeKb} KB, via ${usedTool})`
);
