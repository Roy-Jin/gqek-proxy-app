import { defineStore } from "pinia";
import { updateConfig } from "@/config/env";

export const UPDATE_SETTINGS_KEY = "app-update-settings";

export const useUpdateStore = defineStore("update", {
  state: () => ({
    proxyEnabled: updateConfig.proxyEnabled,
    autoCheckEnabled: true,
    preferredProxy: "",
  }),
  actions: {
    setProxyEnabled(value: boolean) {
      this.proxyEnabled = value;
    },
    setAutoCheckEnabled(value: boolean) {
      this.autoCheckEnabled = value;
    },
    setPreferredProxy(value: string) {
      this.preferredProxy = value;
    },
  },
  persist: {
    key: UPDATE_SETTINGS_KEY,
    storage: localStorage,
  },
});
