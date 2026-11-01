import { createClient } from "../utils/request.js";
import { useGlobal } from "../stores/global.js";

export const BASE_URL = "https://gqhw.jxmediacenter.com/prod-api";

/** Read token from the auth store; no active pinia (e.g. scripts) yields null */
function getToken(): string | null {
  try {
    return useGlobal().token || null;
  } catch {
    return null;
  }
}

export const http = createClient({ baseUrl: BASE_URL, getToken });
