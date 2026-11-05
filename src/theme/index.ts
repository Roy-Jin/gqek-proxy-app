import { ref } from "vue";
import { StyleProvider } from "@varlet/ui";
import { getThemeVars, type ThemeMode, type ThemePreference } from "./tokens";

const STORAGE_KEY = "gqek:theme-preference";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function resolveMode(preference: ThemePreference): ThemeMode {
  if (preference === "system") return darkQuery.matches ? "dark" : "light";
  return preference;
}

/** Read the resolved page surface from CSS so the native shell matches the theme. */
function updateThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const surface = getComputedStyle(document.documentElement).getPropertyValue("--md-surface").trim();
  if (surface) meta.setAttribute("content", surface);
}

/** Apply the resolved palette; Varlet vars and native controls follow together. */
export function applyTheme(preference: ThemePreference) {
  const mode = resolveMode(preference);
  StyleProvider(getThemeVars(mode));
  document.documentElement.style.colorScheme = mode;
  document.documentElement.dataset.theme = mode;
  updateThemeColor();
}

const preference = ref<ThemePreference>(readPreference());

export function useThemePreference() {
  function set(next: ThemePreference) {
    preference.value = next;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }
  return { preference, set };
}

export function initTheme() {
  applyTheme(preference.value);
  darkQuery.addEventListener("change", () => {
    if (preference.value === "system") applyTheme("system");
  });
}
