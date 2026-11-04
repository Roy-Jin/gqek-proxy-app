import { onUnmounted, ref } from "vue";

export const DEBUG_UNLOCK_FLAG = "app-debug-unlocked";
const HOLD_MS = 5000;
// Release after a completed hold also fires a click; only swallow that one.
const CLICK_SUPPRESS_MS = 800;

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(DEBUG_UNLOCK_FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Debug entry unlock: hold the confirm button for (HOLD_MS/1000) seconds.
 * The flag lives in sessionStorage, so it only lasts for the current webview session.
 */
export function useDebugUnlock() {
  const unlocked = ref(readFlag());
  let timer: ReturnType<typeof setTimeout> | null = null;
  let suppressClickUntil = 0;

  function cancelPress() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    window.removeEventListener("scroll", cancelPress, true);
  }

  function startPress() {
    if (unlocked.value || timer !== null) return;
    suppressClickUntil = 0;
    window.addEventListener("scroll", cancelPress, true);
    timer = setTimeout(() => {
      timer = null;
      window.removeEventListener("scroll", cancelPress, true);
      suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
      unlocked.value = true;
      try {
        sessionStorage.setItem(DEBUG_UNLOCK_FLAG, "1");
      } catch {
        /* storage unavailable: keep the in-memory flag only */
      }
    }, HOLD_MS);
  }

  /** Returns true for the click fired by releasing a completed hold. */
  function shouldBlockClick() {
    if (Date.now() >= suppressClickUntil) return false;
    suppressClickUntil = 0;
    return true;
  }

  onUnmounted(cancelPress);

  return { unlocked, startPress, cancelPress, shouldBlockClick };
}
