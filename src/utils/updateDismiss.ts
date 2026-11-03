const DISMISSED_VERSION_KEY = "app-update-dismissed-version";

/** Version dismissed by "稍后" in this app session; empty when none. */
export function readDismissedVersion(): string {
  try {
    return sessionStorage.getItem(DISMISSED_VERSION_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberDismissedVersion(version: string) {
  try {
    sessionStorage.setItem(DISMISSED_VERSION_KEY, version);
  } catch {
    /* session storage unavailable, dismissal is just not remembered */
  }
}
