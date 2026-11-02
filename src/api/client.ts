import { createClient } from "../utils/request.js";
import { useGlobal } from "../stores/global.js";
import { linksConfig } from "../config/env.js";
import { handleSessionExpired } from "./authGuard.js";

/** Read token from the auth store; no active pinia (e.g. scripts) yields null */
function getToken(): string | null {
  try {
    return useGlobal().token || null;
  } catch {
    return null;
  }
}

export const http = createClient({
  baseUrl: linksConfig.apiBaseUrl,
  getToken,
  onUnauthorized: handleSessionExpired,
});
