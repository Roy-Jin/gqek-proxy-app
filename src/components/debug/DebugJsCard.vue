<template>
  <AppCard class="mb-4">
    <p class="text-sm font-medium text-gray-700 mb-3">JS 调试</p>
    <textarea
      v-model="code"
      rows="4"
      spellcheck="false"
      placeholder="输入 JS 代码，支持 await；表达式会直接显示结果"
      class="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 resize-y"
      @keydown="onKeydown"
    ></textarea>
    <div class="mt-2 flex items-center justify-between gap-2">
      <p class="text-xs text-gray-400">Ctrl/⌘ + Enter 执行</p>
      <div class="flex gap-2">
        <AppButton variant="ghost" size="sm" :disabled="entries.length === 0" @click="entries = []">
          清空
        </AppButton>
        <AppButton variant="secondary" size="sm" :loading="running" @click="run">执行</AppButton>
      </div>
    </div>

    <div v-if="entries.length > 0" class="mt-3 space-y-2">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-lg bg-gray-50 p-3 text-xs font-mono"
      >
        <p class="whitespace-pre-wrap break-all text-gray-400">&gt; {{ entry.code }}</p>
        <p
          v-for="(line, i) in entry.logs"
          :key="i"
          class="mt-1 whitespace-pre-wrap break-all text-gray-600"
        >{{ line }}</p>
        <p
          class="mt-1 whitespace-pre-wrap break-all"
          :class="entry.error ? 'text-red-500' : 'text-green-600'"
        >{{ entry.output }}</p>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppCard from "@/components/ui/AppCard.vue";
import AppButton from "@/components/ui/AppButton.vue";

interface EvalEntry {
  id: number;
  code: string;
  logs: string[];
  output: string;
  error: boolean;
}

const code = ref("");
const entries = ref<EvalEntry[]>([]);
const running = ref(false);
let seq = 0;

function stringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "string") return value;
  if (typeof value === "function") return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Circular structures fall back to the default string form.
    return String(value);
  }
}

/** Compile as an expression first so `1 + 1` prints 2 like a REPL. */
function compile(snippet: string): () => Promise<unknown> {
  try {
    return new Function(`return (async () => (${snippet}))()`) as () => Promise<unknown>;
  } catch {
    return new Function(`return (async () => { ${snippet} })()`) as () => Promise<unknown>;
  }
}

const CAPTURED = ["log", "info", "warn", "error", "debug"] as const;

async function run() {
  const snippet = code.value.trim();
  if (!snippet || running.value) return;
  running.value = true;
  const entry: EvalEntry = { id: ++seq, code: snippet, logs: [], output: "", error: false };

  // Hook console so prints inside the snippet appear inline; chains to the
  // previously installed handler (debug logger) and is restored afterwards.
  type ConsoleFn = (...values: unknown[]) => void;
  const target = console as unknown as Record<string, ConsoleFn | undefined>;
  const originals = CAPTURED.map((level) => [level, target[level]] as const);
  for (const [level, original] of originals) {
    target[level] = (...values: unknown[]) => {
      entry.logs.push(`[${level}] ` + values.map(stringify).join(" "));
      original?.apply(console, values);
    };
  }

  try {
    const result = await compile(snippet)();
    entry.output = "⇐ " + stringify(result);
  } catch (e) {
    entry.output = "✗ " + stringify(e);
    entry.error = true;
  } finally {
    for (const [level, original] of originals) target[level] = original;
    entries.value.unshift(entry);
    running.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void run();
  }
}
</script>
