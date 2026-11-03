import { defineStore } from "pinia";
import { updateConfig } from "@/config/env";

export const UPDATE_SETTINGS_KEY = "app-update-settings";

export const useUpdateStore = defineStore("update", {
  state: () => ({
    proxyEnabled: updateConfig.proxyEnabled,
    autoCheckEnabled: true,
    // Custom proxy priority from the debug page; empty means the env default order.
    proxyOrder: [] as string[],
  }),
  getters: {
    /** Effective probe order: custom order, with newly added defaults appended. */
    orderedProxies(state): string[] {
      const defaults = updateConfig.downloadProxies;
      const custom = state.proxyOrder.filter((proxy) => defaults.includes(proxy));
      const added = defaults.filter((proxy) => !custom.includes(proxy));
      return [...custom, ...added];
    },
  },
  actions: {
    setProxyEnabled(value: boolean) {
      this.proxyEnabled = value;
    },
    setAutoCheckEnabled(value: boolean) {
      this.autoCheckEnabled = value;
    },
    setProxyOrder(value: string[]) {
      this.proxyOrder = value;
    },
    resetProxyOrder() {
      this.proxyOrder = [];
    },
  },
  persist: {
    key: UPDATE_SETTINGS_KEY,
    storage: localStorage,
  },
});
