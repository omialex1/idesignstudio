// Server side of the anti-bot check (Cloudflare Turnstile).
//
// It is switched on by TURNSTILE_SECRET_KEY (here) together with
// NEXT_PUBLIC_TURNSTILE_SITE_KEY (the page widget). Until the secret key is set
// every request passes, so the site works before the keys exist.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyCaptcha(
  token: unknown,
  ip: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || token.length === 0) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // If Cloudflare cannot be reached we let the request through (a bot check
    // outage must not stop real customers); the attempt limits still apply.
    console.error(
      "Turnstile verification unavailable, allowing the request",
      err,
    );
    return true;
  }
}
