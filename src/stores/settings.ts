import { defineStore } from "pinia";

export type DefaultEntry = "activity" | "todo" | "about";

export const DEFAULT_ENTRY_PATH: Record<DefaultEntry, string> = {
  activity: "/activity",
  todo: "/todo",
  about: "/about",
};

const STORAGE_KEY = "app-settings";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    defaultEntry: "activity" as DefaultEntry,
  }),
  persist: {
    key: STORAGE_KEY,
    storage: localStorage,
  },
});
