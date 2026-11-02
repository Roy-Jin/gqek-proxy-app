import { defineStore } from "pinia";
import type {
  AboutConfig,
  AppConfig,
  AuthConfig,
  DeveloperConfig,
  LinksConfig,
  UiConfig,
} from "../config/env.js";
import {
  aboutConfig,
  appConfig,
  authConfig,
  developerConfig,
  linksConfig,
  uiConfig,
} from "../config/env.js";

export interface EnvState {
  app: AppConfig;
  auth: AuthConfig;
  developer: DeveloperConfig;
  about: AboutConfig;
  links: LinksConfig;
  ui: UiConfig;
}

export const useEnvStore = defineStore("env", {
  state: (): EnvState => ({
    app: { ...appConfig },
    auth: { ...authConfig },
    developer: { ...developerConfig },
    about: { ...aboutConfig },
    links: { ...linksConfig },
    ui: { ...uiConfig },
  }),
});
