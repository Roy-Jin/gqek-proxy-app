import { defineStore } from "pinia";
import type { UserBrief } from "./global";

export const ACCOUNTS_STORE_KEY = "app-accounts";

export interface SavedAccount extends UserBrief {
  /** Bearer token; persisted locally, never rendered or logged. */
  token: string;
  lastUsedAt: number;
}

/** Token-free view model for any UI that lists saved accounts. */
export interface AccountSummary {
  userId: string;
  userName: string;
  schoolName: string;
}

export const useAccountsStore = defineStore("accounts", {
  state: () => ({
    accounts: [] as SavedAccount[],
  }),
  getters: {
    summaries: (state): AccountSummary[] =>
      [...state.accounts]
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .map(({ userId, userName, schoolName }) => ({
          userId,
          userName: userName || "",
          schoolName: schoolName || "",
        })),
  },
  actions: {
    remember(user: UserBrief, token: string) {
      const id = user.userId;
      if (!id || !token) return;
      const record: SavedAccount = { ...user, token, lastUsedAt: Date.now() };
      const index = this.accounts.findIndex((item) => item.userId === id);
      if (index >= 0) {
        this.accounts[index] = record;
      } else {
        this.accounts.push(record);
      }
    },
    forget(userId: string) {
      this.accounts = this.accounts.filter((item) => item.userId !== userId);
    },
  },
  persist: {
    key: ACCOUNTS_STORE_KEY,
    storage: localStorage,
  },
});
