import { ref } from "vue";

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LogEntry {
  id: number;
  level: LogLevel;
  time: string;
  args: string[];
}

const MAX_LOGS = 500;
const logs = ref<LogEntry[]>([]);
/** Recording is off by default and enabled explicitly inside the debug page. */
const enabled = ref(false);
let seq = 0;

function stringify(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function addLog(level: LogLevel, values: unknown[]) {
  if (!enabled.value) return;
  logs.value.push({
    id: ++seq,
    level,
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    args: values.map(stringify),
  });
  if (logs.value.length > MAX_LOGS) {
    logs.value = logs.value.slice(-MAX_LOGS);
  }
}

export function clearLogs() {
  logs.value = [];
}

export function useDebugLog() {
  return { logs, clearLogs, enabled };
}

type ConsoleMethod = (...values: unknown[]) => void;
const LEVELS: LogLevel[] = ["log", "info", "warn", "error", "debug"];

/** Override console methods to also record output (only while recording is enabled). */
export function setupConsoleLogger() {
  const target = console as unknown as Record<string, ConsoleMethod>;
  for (const level of LEVELS) {
    const original = target[level];
    target[level] = (...values: unknown[]) => {
      addLog(level, values);
      original?.apply(console, values);
    };
  }
}