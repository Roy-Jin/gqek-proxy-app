import { useAccountsStore } from "../stores/accounts.js";
import { useGlobal } from "../stores/global.js";
import { useToast } from "../composables/useToast.js";

/**
 * Session guard for a rejected token.
 *
 * Runs only when the failing token is the active one, so validating another saved
 * account (switch dialog) never logs the current session out. The first call clears
 * `auth.token`, which makes every concurrent 401 for the same token a no-op.
 */
export function handleSessionExpired(failedToken: string) {
  try {
    const auth = useGlobal();
    if (!failedToken || auth.token !== failedToken) return;

    auth.clear();

    const accounts = useAccountsStore();
    const stale = accounts.accounts.find((item) => item.token === failedToken);
    if (stale) accounts.forget(stale.userId);

    useToast().error("登录已失效，请重新登录");
  } catch {
    /* No active pinia (scripts): nothing to reset. */
  }
}
