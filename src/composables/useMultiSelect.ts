import { computed, ref } from "vue";
import type { Ref } from "vue";

/** Id-based multi-select state shared by list pages and modals. */
export function useMultiSelect<T>(items: Ref<T[]>, getId: (item: T) => string) {
  const selectedIds = ref<string[]>([]);

  const allSelected = computed(
    () =>
      items.value.length > 0 &&
      items.value.every((item) => selectedIds.value.includes(getId(item)))
  );

  function toggle(id: string) {
    const index = selectedIds.value.indexOf(id);
    if (index >= 0) selectedIds.value.splice(index, 1);
    else selectedIds.value.push(id);
  }

  function toggleAll() {
    selectedIds.value = allSelected.value ? [] : items.value.map(getId);
  }

  function clear() {
    selectedIds.value = [];
  }

  return { selectedIds, allSelected, toggle, toggleAll, clear };
}
