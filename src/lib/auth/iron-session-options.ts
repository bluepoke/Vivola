import type { SessionOptions } from "iron-session";

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a string of at least 32 characters");
  }
  return secret;
}

export function createSessionOptions(cookieName: string): SessionOptions {
  return {
    get password() {
      return sessionSecret();
    },
    cookieName,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
}
