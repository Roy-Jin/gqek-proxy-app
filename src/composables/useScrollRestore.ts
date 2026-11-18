import { onActivated } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";

/** Last scroll offset per route path; the app shell scrolls <main>, not the window. */
const offsets = new Map<string, number>();

function mainScroller() {
  return document.querySelector<HTMLElement>("main");
}

/**
 * KeepAlive empties <main> when a cached page is deactivated, so the browser clamps
 * its scrollTop to 0. Save the offset on route leave and restore it on activation.
 */
export function useScrollRestore() {
  const route = useRoute();

  onBeforeRouteLeave(() => {
    const scroller = mainScroller();
    if (scroller) offsets.set(route.path, scroller.scrollTop);
  });

  onActivated(() => {
    const scroller = mainScroller();
    const top = offsets.get(route.path);
    if (scroller && top) scroller.scrollTop = top;
  });
}
