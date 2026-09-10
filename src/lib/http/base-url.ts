import { headers } from "next/headers";

// APP_BASE_URL is the operator-configured canonical origin. Without it, we
// fall back to the request's Host header, which a client can spoof (directly
// or via an unvalidated reverse-proxy Host) to make the QR code/join link
// shown to a whole classroom point at an attacker-controlled domain.
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_BASE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}`;
}
