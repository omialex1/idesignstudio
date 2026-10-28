import type { Instrumentation } from "next";

// Every unexpected server error (a page, an API route or an admin action that
// crashes) is reported to the office mailbox, at most once per route per 30
// minutes. Expected "errors" (not logged in, bad input) are left out.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const message = err instanceof Error ? err.message : String(err);
  if (message === "unauthorized") return;
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest: unknown }).digest)
      : undefined;
  // redirects and not-found pages are normal control flow
  if (digest?.startsWith("NEXT_")) return;

  const { sendAlert } = await import("@/lib/alerts");
  // the path without the query string, which may hold a token
  const path = request.path.split("?")[0];
  await sendAlert({
    key: `server-error-${context.routePath}`,
    subject: `Eroare pe site: ${context.routePath}`,
    lines: [
      `Pagina sau ruta: ${path} (${request.method}, ${context.routeType})`,
      `Mesaj: ${message.slice(0, 300)}`,
      ...(digest ? [`Cod intern: ${digest}`] : []),
      "Detaliile complete sunt în jurnalele din Vercel, la ora acestei alerte.",
    ],
    throttleMs: 30 * 60 * 1000,
  });
};
