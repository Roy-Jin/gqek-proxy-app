<template>
  <VarPaper class="mb-4 p-4" :elevation="0" :radius="16" style="--paper-background: var(--md-surface-container)">
    <h3 class="mb-3 text-base font-medium text-on-surface">JS 调试</h3>
    <VarInput
      v-model="code"
      class="debug-field font-mono"
      textarea
      variant="outlined"
      :rows="4"
      spellcheck="false"
      placeholder="输入 JS 代码，支持 await；表达式会直接显示结果"
      :hint="false"
      @keydown="onKeydown"
    />
    <div class="mt-2 flex items-center justify-between gap-2">
      <p class="text-xs text-on-surface-variant">Ctrl/⌘ + Enter 执行</p>
      <div class="flex gap-2">
        <VarButton text size="small" :disabled="entries.length === 0" @click="entries = []">
          清空
        </VarButton>
        <VarButton type="primary" tonal size="small" :loading="running" @click="run">执行</VarButton>
      </div>
    </div>

    <div v-if="entries.length > 0" class="mt-3 max-h-96 space-y-2 overflow-auto">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-md bg-surface-high p-3 font-mono text-xs"
      >
        <p class="whitespace-pre-wrap break-all text-on-surface-variant">&gt; {{ entry.code }}</p>
        <p
          v-for="(line, i) in entry.logs"
          :key="i"
          class="mt-1 whitespace-pre-wrap break-all text-on-surface"
        >{{ line }}</p>
        <p
          class="mt-1 whitespace-pre-wrap break-all"
          :class="entry.error ? 'text-error' : 'text-success'"
        >{{ entry.output }}</p>
      </div>
    </div>
  </VarPaper>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Button as VarButton, Input as VarInput, Paper as VarPaper } from "@varlet/ui";

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
    return String(value);
  }
}

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

<style scoped>
.debug-field {
  --field-decorator-text-color: var(--md-on-surface);
  --field-decorator-blur-color: var(--md-outline);
  --field-decorator-focus-color: var(--md-primary);
  --field-decorator-line-border-radius: 12px;
}
</style>
