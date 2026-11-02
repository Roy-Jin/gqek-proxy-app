import { ref } from "vue";
import { useEnvStore } from "@/stores/env";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const toasts = ref<ToastItem[]>([]);
let seq = 0;

function remove(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useToast() {
  const env = useEnvStore();

  function push(type: ToastType, message: string, duration = env.ui.toastDurationMs) {
    const id = ++seq;
    toasts.value.push({ id, type, message });
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }

  return {
    toasts,
    dismiss: remove,
    success: (message: string, duration?: number) => push("success", message, duration),
    error: (message: string, duration?: number) => push("error", message, duration),
    info: (message: string, duration?: number) => push("info", message, duration),
  };
}