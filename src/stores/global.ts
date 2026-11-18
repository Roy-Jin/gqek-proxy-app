import { defineStore } from "pinia";

export const STORE_KEY = "app-global";

/** How the current session was established; only "account" may mint temp keys. */
export type LoginMethod = "account" | "key";

export interface UserBrief {
  userName: string;
  /** Student number / account identifier from /getInfo; the only displayed account label */
  nickName: string;
  schoolName: string;
  /** School id used by school-scoped APIs such as student search */
  schoolId?: string;
  userId: string;
  avatar?: string;
  className?: string;
  /** Raw /getInfo userType; "1" means student account in the official app */
  userType?: string;
  orgName?: string;
  roles?: string[];
}

function readInitialOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export const useGlobal = defineStore("global", {
  state: () => ({
    token: "",
    isAuthed: false,
    authChecked: false,
    loginMethod: "" as LoginMethod | "",
    user: null as UserBrief | null,
    /** Whether the device has a network connection (navigator.onLine). */
    isOnline: readInitialOnline(),
  }),
  actions: {
    /** Bind window online/offline events to keep isOnline in sync. Safe to call multiple times. */
    bindNetworkListener() {
      if (typeof window === "undefined") return;
      const self = this as unknown as { _netBound?: boolean };
      if (self._netBound) return;
      self._netBound = true;
      window.addEventListener("online", () => {
        this.isOnline = true;
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    },
    setToken(value: string) {
      this.token = value.trim();
    },
    setLoginMethod(value: LoginMethod | "") {
      this.loginMethod = value;
    },
    setUser(user: UserBrief) {
      this.user = user;
    },
    /** Reset in-memory auth state; keeps `authChecked` so the login page renders immediately. */
    clear() {
      this.token = "";
      this.isAuthed = false;
      this.authChecked = true;
      this.loginMethod = "";
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