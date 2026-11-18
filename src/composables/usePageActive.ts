import { onActivated, onDeactivated, ref } from "vue";

/**
 * True while the owning page is the visible view inside a <KeepAlive> tree.
 *
 * Body-teleported UI (BackTop, Fab, ...) must be unmounted when a cached page is
 * deactivated: Vue only moves the page's own DOM to the storage container, so
 * teleported nodes would stay in <body> and linger over the next page.
 */
export function usePageActive() {
  const active = ref(true);

  onActivated(() => {
    active.value = true;
  });

  onDeactivated(() => {
    active.value = false;
  });

  return active;
}
