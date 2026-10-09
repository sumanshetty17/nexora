import { getRequest } from "@tanstack/react-start/server";

/**
 * Google and X go through the shared Grok broker. The preview client only
 * accepts callbacks on `*.grok-sandbox.com`. A public host such as Vercel is
 * rejected after the user clicks Continue, as `{"message":"Invalid redirect URI"}`.
 * A dedicated client (injected `GROK_AUTH_CLIENT_ID`) is registered for that app's
 * own origin, so those buttons are safe there.
 */
export function brokerSignInAllowed(): boolean {
  if (process.env.GROK_AUTH_CLIENT_ID?.trim()) return true;
  const request = getRequest();
  const raw =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const host = raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  return host.endsWith(".grok-sandbox.com");
}
