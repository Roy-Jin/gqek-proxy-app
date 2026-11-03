import { defineStore } from "pinia";
import type {
  AboutConfig,
  AppConfig,
  AuthConfig,
  DeveloperConfig,
  LinksConfig,
  UiConfig,
  UpdateConfig,
} from "../config/env.js";
import {
  aboutConfig,
  appConfig,
  authConfig,
  developerConfig,
  linksConfig,
  uiConfig,
  updateConfig,
} from "../config/env.js";

export interface EnvState {
  app: AppConfig;
  auth: AuthConfig;
  developer: DeveloperConfig;
  about: AboutConfig;
  links: LinksConfig;
  update: UpdateConfig;
  ui: UiConfig;
}

export const useEnvStore = defineStore("env", {
  state: (): EnvState => ({
    app: { ...appConfig },
    auth: { ...authConfig },
    developer: { ...developerConfig },
    about: { ...aboutConfig },
    links: { ...linksConfig },
    update: { ...updateConfig },
    ui: { ...uiConfig },
  }),
});
