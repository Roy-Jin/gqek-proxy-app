import { Themes } from "@varlet/ui";

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

type VarMap = Record<string, string>;

/**
 * App color system
 * ----------------
 * The palette is declared as HSL triplets so Varlet can derive every
 * `--color-*` token itself. Both modes expose the same semantic names:
 *   brand:    primary / secondary
 *   feedback: info / success / warning / danger
 *   surfaces: body / surface-container-* / inverse-surface
 *
 * Surface levels follow MD3 tonal elevation: higher containers are darker in
 * light mode and lighter in dark mode. `surface-container` is the raised card
 * surface shared by Paper, Card, Dialog and Popup.
 */
const lightSeeds: VarMap = {
  "--hsl-body": "160, 22%, 95%",
  "--hsl-text": "165, 27%, 9%",
  "--hsl-on-surface-variant": "168, 8%, 27%",

  "--hsl-primary": "174, 100%, 21%",
  "--hsl-on-primary": "0, 0%, 100%",
  "--hsl-primary-container": "169, 77%, 84%",
  "--hsl-on-primary-container": "173, 100%, 6%",

  "--hsl-secondary": "172, 16%, 30%",
  "--hsl-on-secondary": "0, 0%, 100%",
  "--hsl-secondary-container": "170, 14%, 90%",
  "--hsl-on-secondary-container": "172, 20%, 12%",

  "--hsl-info": "206, 85%, 38%",
  "--hsl-on-info": "0, 0%, 100%",
  "--hsl-info-container": "205, 100%, 92%",
  "--hsl-on-info-container": "208, 100%, 13%",

  "--hsl-success": "142, 55%, 30%",
  "--hsl-on-success": "0, 0%, 100%",
  "--hsl-success-container": "140, 60%, 89%",
  "--hsl-on-success-container": "142, 100%, 11%",

  "--hsl-warning": "36, 92%, 31%",
  "--hsl-on-warning": "0, 0%, 100%",
  "--hsl-warning-container": "40, 100%, 86%",
  "--hsl-on-warning-container": "38, 100%, 10%",

  "--hsl-danger": "356, 72%, 42%",
  "--hsl-on-danger": "0, 0%, 100%",
  "--hsl-danger-container": "5, 100%, 93%",
  "--hsl-on-danger-container": "4, 100%, 13%",

  "--hsl-surface-container-low": "160, 18%, 97.5%",
  "--hsl-surface-container": "0, 0%, 100%",
  "--hsl-surface-container-high": "160, 16%, 94%",
  "--hsl-surface-container-highest": "160, 14%, 91%",

  "--hsl-inverse-surface": "164, 17%, 13%",
  "--hsl-outline": "168, 6%, 48%",
  "--hsl-outline-variant": "168, 8%, 80%",
  "--hsl-scrim": "168, 14%, 10%",
  "--hsl-disabled": "165, 8%, 88%",
  "--hsl-text-disabled": "165, 5%, 55%",
};

const darkSeeds: VarMap = {
  "--hsl-body": "168, 14%, 6%",
  "--hsl-text": "150, 3%, 90%",
  "--hsl-on-surface-variant": "158, 6%, 76%",

  "--hsl-primary": "170, 50%, 67%",
  "--hsl-on-primary": "174, 100%, 11%",
  "--hsl-primary-container": "174, 100%, 16%",
  "--hsl-on-primary-container": "169, 77%, 84%",

  "--hsl-secondary": "170, 12%, 72%",
  "--hsl-on-secondary": "172, 24%, 12%",
  "--hsl-secondary-container": "172, 12%, 22%",
  "--hsl-on-secondary-container": "170, 10%, 88%",

  "--hsl-info": "205, 80%, 72%",
  "--hsl-on-info": "210, 100%, 10%",
  "--hsl-info-container": "208, 55%, 24%",
  "--hsl-on-info-container": "205, 100%, 90%",

  "--hsl-success": "142, 45%, 62%",
  "--hsl-on-success": "142, 100%, 10%",
  "--hsl-success-container": "142, 40%, 18%",
  "--hsl-on-success-container": "140, 60%, 89%",

  "--hsl-warning": "42, 90%, 62%",
  "--hsl-on-warning": "42, 100%, 8%",
  "--hsl-warning-container": "40, 60%, 20%",
  "--hsl-on-warning-container": "42, 100%, 86%",

  "--hsl-danger": "6, 100%, 82%",
  "--hsl-on-danger": "357, 100%, 21%",
  "--hsl-danger-container": "357, 100%, 28%",
  "--hsl-on-danger-container": "5, 100%, 93%",

  "--hsl-surface-container-low": "168, 13%, 9%",
  "--hsl-surface-container": "168, 12%, 11.5%",
  "--hsl-surface-container-high": "168, 11%, 15.5%",
  "--hsl-surface-container-highest": "170, 10%, 19.5%",

  "--hsl-inverse-surface": "150, 3%, 90%",
  "--hsl-outline": "164, 6%, 58%",
  "--hsl-outline-variant": "168, 7%, 28%",
  "--hsl-scrim": "0, 0%, 0%",
  "--hsl-disabled": "165, 8%, 22%",
  "--hsl-text-disabled": "160, 5%, 55%",
};

/** Tokens that are shared by both modes because they describe media overlays. */
const sharedTokens: VarMap = {
  "--hsl-on-image": "0, 0%, 100%",
  "--hsl-image-scrim": "0, 0%, 0%",
  "--md-image-scrim":
    "linear-gradient(to top, hsla(var(--hsl-image-scrim), 0.78) 0%, hsla(var(--hsl-image-scrim), 0.28) 45%, transparent 100%)",
};

/** Color tokens Varlet does not ship, derived from the seed palette. */
const derivedColors: VarMap = {
  "--color-secondary": "hsla(var(--hsl-secondary), 1)",
  "--color-on-secondary": "hsla(var(--hsl-on-secondary), 1)",
  "--color-secondary-container": "hsla(var(--hsl-secondary-container), 1)",
  "--color-on-secondary-container": "hsla(var(--hsl-on-secondary-container), 1)",
  "--color-outline-variant": "hsla(var(--hsl-outline-variant), 1)",
  "--color-on-image": "hsla(var(--hsl-on-image), 1)",
};

const lightAliases: VarMap = {
  "--md-shadow-rgb": "16 28 25",
  "--md-scrim": "hsla(var(--hsl-scrim), 0.32)",
  "--md-elevation-0": "none",
  "--md-elevation-1":
    "0 1px 2px rgb(var(--md-shadow-rgb) / 0.05), 0 2px 8px rgb(var(--md-shadow-rgb) / 0.06)",
  "--md-elevation-2":
    "0 2px 6px rgb(var(--md-shadow-rgb) / 0.08), 0 8px 20px rgb(var(--md-shadow-rgb) / 0.08)",
  "--md-elevation-3":
    "0 4px 10px rgb(var(--md-shadow-rgb) / 0.10), 0 16px 32px rgb(var(--md-shadow-rgb) / 0.10)",
};

const darkAliases: VarMap = {
  "--md-shadow-rgb": "0 0 0",
  "--md-scrim": "hsla(var(--hsl-scrim), 0.6)",
  "--md-elevation-0": "none",
  "--md-elevation-1":
    "0 1px 2px rgb(var(--md-shadow-rgb) / 0.45), 0 2px 8px rgb(var(--md-shadow-rgb) / 0.30)",
  "--md-elevation-2":
    "0 2px 6px rgb(var(--md-shadow-rgb) / 0.50), 0 8px 20px rgb(var(--md-shadow-rgb) / 0.38)",
  "--md-elevation-3":
    "0 4px 12px rgb(var(--md-shadow-rgb) / 0.55), 0 16px 36px rgb(var(--md-shadow-rgb) / 0.42)",
};

/** Semantic aliases consumed by Tailwind theme keys and hand-written components. */
const semantics: VarMap = {
  "--md-primary": "var(--color-primary)",
  "--md-on-primary": "var(--color-on-primary)",
  "--md-primary-container": "var(--color-primary-container)",
  "--md-on-primary-container": "var(--color-on-primary-container)",

  "--md-secondary": "var(--color-secondary)",
  "--md-on-secondary": "var(--color-on-secondary)",
  "--md-secondary-container": "var(--color-secondary-container)",
  "--md-on-secondary-container": "var(--color-on-secondary-container)",

  "--md-surface": "var(--color-body)",
  "--md-surface-low": "var(--color-surface-container-low)",
  "--md-surface-container": "var(--color-surface-container)",
  "--md-surface-high": "var(--color-surface-container-high)",
  "--md-surface-highest": "var(--color-surface-container-highest)",
  "--md-inverse-surface": "var(--color-inverse-surface)",
  "--md-on-inverse-surface": "var(--md-surface)",

  "--md-on-surface": "var(--color-text)",
  "--md-on-surface-variant": "var(--color-on-surface-variant)",

  "--md-outline": "var(--color-outline)",
  "--md-outline-variant": "var(--color-outline-variant)",
  "--md-disabled": "var(--color-disabled)",
  "--md-text-disabled": "var(--color-text-disabled)",

  "--md-info": "var(--color-info)",
  "--md-on-info": "var(--color-on-info)",
  "--md-info-container": "var(--color-info-container)",
  "--md-on-info-container": "var(--color-on-info-container)",

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

  "--md-on-image": "var(--color-on-image)",

  "--md-card-surface": "var(--md-surface-container)",
  "--md-card-border": "var(--md-outline-variant)",
  "--md-card-shadow": "var(--md-elevation-1)",
};

/**
 * Varlet component tokens. Everything that is painted as a card, dialog,
 * popup or sheet points at the same raised surface so light and dark keep an
 * identical elevation model; placeholder colors from the built-in themes are
 * replaced with semantic tokens.
 */
const varletOverrides: VarMap = {
  "--paper-background": "var(--md-card-surface)",
  "--paper-surface-low-background": "var(--md-card-surface)",
  "--paper-outline-color": "var(--md-card-border)",
  "--paper-active-color": "var(--md-on-surface)",
  "--paper-active-opacity": "0.12",

  "--card-background": "var(--md-card-surface)",
  "--card-surface-low-background": "var(--md-card-surface)",
  "--card-filled-background": "var(--md-surface-high)",
  "--card-outline-color": "var(--md-card-border)",
  "--card-title-color": "var(--md-on-surface)",
  "--card-subtitle-color": "var(--md-on-surface-variant)",
  "--card-content-color": "var(--md-on-surface-variant)",
  "--card-description-color": "var(--md-on-surface-variant)",
  "--card-floating-buttons-color": "var(--md-on-image)",

  "--dialog-background": "var(--md-card-surface)",
  "--dialog-title-color": "var(--md-on-surface)",
  "--dialog-message-color": "var(--md-on-surface-variant)",
  "--popup-content-background-color": "var(--md-card-surface)",
  "--popup-overlay-background-color": "var(--md-scrim)",
  "--action-sheet-background": "var(--md-card-surface)",
  "--action-sheet-action-item-color": "var(--md-on-surface)",

  "--result-background": "transparent",
  "--result-title-color": "var(--md-on-surface)",
  "--result-description-color": "var(--md-on-surface-variant)",
  "--result-empty-color": "var(--md-on-surface-variant)",
  "--result-empty-border-color": "var(--md-outline-variant)",

  "--chip-default-color": "var(--md-surface-high)",
  "--chip-default-text-color": "var(--md-on-surface)",

  "--list-loading-color": "var(--md-on-surface-variant)",
  "--list-finished-color": "var(--md-on-surface-variant)",
  "--list-error-color": "var(--md-error)",

  "--field-decorator-text-color": "var(--md-on-surface)",
  "--field-decorator-blur-color": "var(--md-outline)",
  "--field-decorator-filled-background-color": "var(--md-surface-high)",
  "--option-text-color": "var(--md-on-surface)",
  "--select-scroller-background": "var(--md-card-surface)",
  "--select-empty-text-color": "var(--md-on-surface-variant)",
  "--select-chip-background-color": "var(--md-surface-high)",

  "--switch-track-background": "var(--md-surface-highest)",
  "--switch-handle-background": "var(--md-surface-highest)",
  "--switch-variant-track-background": "var(--md-surface-highest)",
  "--switch-variant-track-border-color": "var(--md-outline)",
  "--switch-variant-handle-background": "var(--md-outline)",

  "--snackbar-background": "var(--md-inverse-surface)",
  "--snackbar-color": "var(--md-on-inverse-surface)",

  "--skeleton-card-background-color": "var(--md-surface-high)",
  "--skeleton-avatar-background-color": "var(--md-surface-high)",
  "--skeleton-title-background-color": "var(--md-surface-high)",
  "--skeleton-animation-background":
    "linear-gradient(90deg, transparent, color-mix(in srgb, var(--md-on-surface) 10%, transparent), transparent)",

  "--app-bar-text-color": "var(--md-on-primary)",
  "--app-bar-surface-text-color": "var(--md-on-surface)",
  "--bottom-navigation-background-color": "var(--md-card-surface)",
  "--bottom-navigation-item-inactive-color": "var(--md-on-surface-variant)",
};

/** Full token set applied through Varlet StyleProvider. */
export function getThemeVars(mode: ThemeMode): VarMap {
  const base = (mode === "light" ? Themes.md3Light : Themes.md3Dark) as VarMap;
  const seeds = mode === "light" ? lightSeeds : darkSeeds;
  const extra = mode === "light" ? lightAliases : darkAliases;
  return {
    ...base,
    ...sharedTokens,
    ...derivedColors,
    ...seeds,
    ...extra,
    ...semantics,
    ...varletOverrides,
  };
}
