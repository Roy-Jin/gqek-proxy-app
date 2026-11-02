import { computed, ref } from "vue";
import { useAccountSession } from "./useAccountSession";
import { useAccountsStore } from "@/stores/accounts";
import { errorMessage } from "@/utils/error";

/** Saved-account switch state shared by the login and about dialogs. */
export function useAccountSwitch() {
  const accounts = useAccountsStore();
  const session = useAccountSession();

  const switchingId = ref("");
  const errorMsg = ref("");
  const savedAccounts = computed(() => accounts.summaries);

  async function switchTo(userId: string) {
    if (switchingId.value) return;
    const account = accounts.accounts.find((item) => item.userId === userId);
    if (!account) return;
    switchingId.value = userId;
    errorMsg.value = "";
    try {
      await session.switchAccount(account);
    } catch (e) {
      errorMsg.value = "账号切换失败：" + errorMessage(e);
      switchingId.value = "";
    }
  }

  function resetError() {
    errorMsg.value = "";
  }

  return { switchingId, errorMsg, savedAccounts, switchTo, resetError };
}
