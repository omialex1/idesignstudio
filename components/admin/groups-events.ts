import type { GroupProduct } from "@/lib/admin/groups";

// The Groups window lives once in the admin layout; anything can open it.
export const OPEN_GROUPS_EVENT = "admin:open-groups";

// Sent after a group was saved or deleted, so lists elsewhere can reload.
export const GROUPS_CHANGED_EVENT = "admin:groups-changed";

export type OpenGroupsDetail = {
  // open this group
  groupId?: string;
  // start a new group with this product already in it
  newWith?: GroupProduct;
};

export function openGroups(detail: OpenGroupsDetail = {}) {
  window.dispatchEvent(new CustomEvent(OPEN_GROUPS_EVENT, { detail }));
}
