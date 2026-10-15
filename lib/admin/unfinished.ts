// A card order whose payment failed, or that was started and never paid (waiting
// for more than an hour), is "unfinished": the admin hides these by default.
const UNFINISHED_AFTER_MS = 60 * 60 * 1000;

export function isUnfinishedOrder(order: {
  status: string;
  createdAt: Date;
}): boolean {
  if (order.status === "FAILED") return true;
  return (
    order.status === "PENDING" &&
    Date.now() - order.createdAt.getTime() > UNFINISHED_AFTER_MS
  );
}
