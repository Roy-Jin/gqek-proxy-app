import { createApp } from "vue";
import { createPinia } from "pinia";
import { routes } from "vue-router/auto-routes";
import { createRouter, createWebHistory } from "vue-router";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import App from "./App.vue";
import "@varlet/icons";
import "@varlet/ui/es/varlet.css";
import "./styles/base.css";
import { initTheme } from "./theme";
import { setupConsoleLogger } from "./utils/logger";

setupConsoleLogger();
initTheme();

const pinia = createPinia().use(piniaPluginPersistedstate);

const app = createApp(App);
app.use(pinia);
app.use(createRouter({
    history: createWebHistory(),
    routes,
}));
app.mount("#app");