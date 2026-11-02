import { getInfo } from "@/api";
import type { InfoResult } from "@/api";
import { useAccountsStore } from "@/stores/accounts";
import type { SavedAccount } from "@/stores/accounts";
import { useGlobal } from "@/stores/global";
import type { UserBrief } from "@/stores/global";

function readString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function readRoles(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((role): role is string => typeof role === "string")
    : [];
}

export function toUserBrief(info: InfoResult): UserBrief {
  const user = info.data.user;
  const topLevelRoles = readRoles(info.roles);
  const userRoles = readRoles(user.roles);
  return {
    userId: readString(user.userId),
    userName: user.userName,
    nickName: user.nickName || "",
    schoolName: user.schoolName || "",
    avatar: user.avatar || "",
    className: readString(user.className),
    userType: readString(user.userType),
    orgName: readString(user.orgName),
    roles: topLevelRoles.length > 0 ? topLevelRoles : userRoles,
  };
}

async function fetchUserInfo(token: string): Promise<UserBrief> {
  const body = (await getInfo({ token })).data;
  if (body.code !== 200) throw new Error(body.msg || `用户信息获取失败（${body.code}）`);
  return toUserBrief(body);
}

export function useAccountSession() {
  const auth = useGlobal();
  const accounts = useAccountsStore();

  function rememberCurrent() {
    if (!auth.user) return;
    accounts.remember(auth.user, auth.token);
  }

  /** Refresh profile fields for the active token; keep old values when offline. */
  async function refreshCurrentUser() {
    if (!auth.token) return;
    try {
      const user = await fetchUserInfo(auth.token);
      auth.setUser(user);
      accounts.remember(user, auth.token);
    } catch {
      /* About page falls back to placeholders when fields are missing. */
    }
  }

  /** Validate a saved token, then reload so every account-scoped list refetches. */
  async function switchAccount(account: SavedAccount) {
    const user = await fetchUserInfo(account.token);
    auth.setToken(account.token);
    auth.setUser(user);
    auth.isAuthed = true;
    auth.authChecked = true;
    accounts.remember(user, account.token);
    window.location.reload();
  }

  /** Keep the active account saved, then show the login view for a new account. */
  function beginAddAccount() {
    rememberCurrent();
    auth.clear();
  }

  /** Drop the active account record before logging out. */
  function forgetCurrent() {
    const id = auth.user?.userId || accounts.accounts.find((item) => item.token === auth.token)?.userId;
    if (id) accounts.forget(id);
  }

  return {
    rememberCurrent,
    refreshCurrentUser,
    switchAccount,
    beginAddAccount,
    forgetCurrent,
  };
}
