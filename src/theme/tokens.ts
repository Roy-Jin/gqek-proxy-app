import { Themes } from "@varlet/ui";

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

type VarMap = Record<string, string>;

/**
 * Material 3 seed palette as HSL triplets. Varlet derives every --color-* token
 * from these seeds, so overriding them re-themes every Varlet component.
 */
const lightSeeds: VarMap = {
  "--hsl-body": "160, 22%, 97%",
  "--hsl-text": "165, 27%, 9%",
  "--hsl-on-surface-variant": "168, 8%, 27%",

  "--hsl-primary": "174, 100%, 21%",
  "--hsl-on-primary": "0, 0%, 100%",
  "--hsl-primary-container": "169, 77%, 78%",
  "--hsl-on-primary-container": "173, 100%, 6%",

  "--hsl-info": "170, 15%, 34%",
  "--hsl-on-info": "0, 0%, 100%",
  "--hsl-info-container": "168, 22%, 88%",
  "--hsl-on-info-container": "171, 51%, 8%",

  "--hsl-success": "105, 50%, 26%",
  "--hsl-on-success": "0, 0%, 100%",
  "--hsl-success-container": "100, 60%, 82%",
  "--hsl-on-success-container": "103, 60%, 10%",

  "--hsl-warning": "40, 100%, 25%",
  "--hsl-on-warning": "0, 0%, 100%",
  "--hsl-warning-container": "42, 100%, 83%",
  "--hsl-on-warning-container": "42, 100%, 8%",

  "--hsl-danger": "356, 75%, 42%",
  "--hsl-on-danger": "0, 0%, 100%",
  "--hsl-danger-container": "5, 100%, 92%",
  "--hsl-on-danger-container": "4, 100%, 13%",

  "--hsl-surface-container-low": "160, 15%, 96%",
  "--hsl-surface-container": "162, 12%, 94%",
  "--hsl-surface-container-high": "160, 10%, 91%",
  "--hsl-surface-container-highest": "160, 9%, 88%",

  "--hsl-inverse-surface": "164, 17%, 13%",
  "--hsl-outline": "168, 5%, 46%",
  "--hsl-disabled": "165, 8%, 88%",
  "--hsl-text-disabled": "165, 5%, 55%",
};

const darkSeeds: VarMap = {
  "--hsl-body": "168, 14%, 7%",
  "--hsl-text": "150, 3%, 88%",
  "--hsl-on-surface-variant": "158, 6%, 77%",

  "--hsl-primary": "170, 50%, 67%",
  "--hsl-on-primary": "174, 100%, 11%",
  "--hsl-primary-container": "174, 100%, 16%",
  "--hsl-on-primary-container": "169, 77%, 78%",

  "--hsl-info": "168, 20%, 74%",
  "--hsl-on-info": "171, 51%, 8%",
  "--hsl-info-container": "166, 21%, 21%",
  "--hsl-on-info-container": "168, 6%, 86%",

  "--hsl-success": "110, 45%, 70%",
  "--hsl-on-success": "103, 60%, 10%",
  "--hsl-success-container": "110, 35%, 20%",
  "--hsl-on-success-container": "100, 60%, 82%",

  "--hsl-warning": "42, 90%, 62%",
  "--hsl-on-warning": "42, 100%, 8%",
  "--hsl-warning-container": "40, 60%, 20%",
  "--hsl-on-warning-container": "42, 100%, 83%",

  "--hsl-danger": "6, 100%, 83%",
  "--hsl-on-danger": "357, 100%, 21%",
  "--hsl-danger-container": "357, 100%, 29%",
  "--hsl-on-danger-container": "5, 100%, 92%",

  "--hsl-surface-container-low": "163, 16%, 8%",
  "--hsl-surface-container": "167, 16%, 11%",
  "--hsl-surface-container-high": "168, 14%, 14%",
  "--hsl-surface-container-highest": "171, 15%, 17%",

  "--hsl-inverse-surface": "150, 3%, 88%",
  "--hsl-outline": "164, 5%, 56%",
  "--hsl-disabled": "165, 8%, 22%",
  "--hsl-text-disabled": "160, 5%, 55%",
};

const lightAliases: VarMap = {
  "--md-outline-variant": "#bec9c6",
  "--md-scrim": "rgba(16, 28, 25, 0.32)",
  "--md-elevation-0": "none",
  "--md-elevation-1":
    "0 1px 2px rgba(16, 28, 25, 0.06), 0 1px 3px rgba(16, 28, 25, 0.08)",
  "--md-elevation-2":
    "0 2px 6px rgba(16, 28, 25, 0.08), 0 6px 16px rgba(16, 28, 25, 0.06)",
  "--md-elevation-3":
    "0 4px 8px rgba(16, 28, 25, 0.10), 0 12px 24px rgba(16, 28, 25, 0.08)",
};

const darkAliases: VarMap = {
  "--md-outline-variant": "#3f4947",
  "--md-scrim": "rgba(0, 0, 0, 0.6)",
  "--md-elevation-0": "none",
  "--md-elevation-1": "0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)",
  "--md-elevation-2": "0 2px 6px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 0, 0, 0.3)",
  "--md-elevation-3": "0 4px 12px rgba(0, 0, 0, 0.5), 0 16px 32px rgba(0, 0, 0, 0.35)",
};

/** Semantic aliases consumed by Tailwind theme keys and hand-written components. */
const semantics: VarMap = {
  "--md-primary": "var(--color-primary)",
  "--md-on-primary": "var(--color-on-primary)",
  "--md-primary-container": "var(--color-primary-container)",
  "--md-on-primary-container": "var(--color-on-primary-container)",

  "--md-secondary-container": "var(--color-info-container)",
  "--md-on-secondary-container": "var(--color-on-info-container)",

  "--md-surface": "var(--color-body)",
  "--md-surface-low": "var(--color-surface-container-low)",
  "--md-surface-container": "var(--color-surface-container)",
  "--md-surface-high": "var(--color-surface-container-high)",
  "--md-surface-highest": "var(--color-surface-container-highest)",
  "--md-inverse-surface": "var(--color-inverse-surface)",

  "--md-on-surface": "var(--color-text)",
  "--md-on-surface-variant": "var(--color-on-surface-variant)",

  "--md-outline": "var(--color-outline)",

  "--md-error": "var(--color-danger)",
  "--md-on-error": "var(--color-on-danger)",
  "--md-error-container": "var(--color-danger-container)",
  "--md-on-error-container": "var(--color-on-danger-container)",

  "--md-success": "var(--color-success)",
  "--md-on-success": "var(--color-on-success)",
  "--md-success-container": "var(--color-success-container)",
  "--md-on-success-container": "var(--color-on-success-container)",

  "--md-warning": "var(--color-warning)",
  "--md-on-warning": "var(--color-on-warning)",
  "--md-warning-container": "var(--color-warning-container)",
  "--md-on-warning-container": "var(--color-on-warning-container)",
};

/** Full token set applied through Varlet StyleProvider. */
export function getThemeVars(mode: ThemeMode): VarMap {
  const base = (mode === "light" ? Themes.md3Light : Themes.md3Dark) as VarMap;
  const seeds = mode === "light" ? lightSeeds : darkSeeds;
  const extra = mode === "light" ? lightAliases : darkAliases;
  return { ...base, ...seeds, ...extra, ...semantics };
}
