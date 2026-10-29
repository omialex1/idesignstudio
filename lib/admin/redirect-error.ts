// A server action that ends with redirect() makes the awaiting browser code see
// an error whose digest starts with NEXT_REDIRECT. It is not a failure: the page
// is already on its way to the new address, so forms must not show an error for it.
export function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
