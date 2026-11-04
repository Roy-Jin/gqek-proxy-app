import { Snackbar } from "@varlet/ui";
import { useEnvStore } from "@/stores/env";

export type ToastType = "success" | "error" | "info";

/**
 * Toast facade over Varlet Snackbar: pages keep calling
 * success / error / info without owning presentation details.
 */
export function useToast() {
  const env = useEnvStore();
  const defaultDuration = env.ui.toastDurationMs;

  function show(type: ToastType, message: string, duration = defaultDuration) {
    Snackbar[type]({ content: message, duration, position: "top" });
  }

  return {
    success: (message: string, duration?: number) => show("success", message, duration),
    error: (message: string, duration?: number) => show("error", message, duration),
    info: (message: string, duration?: number) => show("info", message, duration),
  };
}
