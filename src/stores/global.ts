import { defineStore } from "pinia";

export const STORE_KEY = "app-global";

export interface UserBrief {
  userName: string;
  schoolName: string;
  userId: string;
}

export const useGlobal = defineStore("global", {
  state: () => ({
    token: "",
    isAuthed: false,
    authChecked: false,
    user: null as UserBrief | null,
  }),
  getters: {
    displayName: (state) => state.user?.userName || "",
  },
  actions: {
    setToken(value: string) {
      this.token = value.trim();
    },
    setUser(user: UserBrief) {
      this.user = user;
    },
    /** Reset in-memory auth state; keeps `authChecked` so the login page renders immediately. */
    clear() {
      this.token = "";
      this.isAuthed = false;
      this.authChecked = true;
      this.user = null;
    },
    /** Destroy the persisted auth credentials and reset the application state. */
    logout() {
      this.clear();
      localStorage.removeItem(STORE_KEY);
    },
  },
  persist: {
    key: STORE_KEY,
    storage: localStorage,
  },
});