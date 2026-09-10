export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Validates a Google ID Token (credential) received from Google Identity Services.
 * Verifies authenticity, audience, issuer, expiration, and verified email status.
 */
export async function verifyGoogleIdToken(token: string): Promise<GoogleTokenPayload> {
  if (!token || typeof token !== "string") {
    throw new Error("Missing or invalid Google credential token");
  }

  const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

  // Verify via Google tokeninfo endpoint
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Google token validation failed: ${errorText}`);
  }

  const data = await response.json() as Record<string, any>;

  if (!data.sub || !data.email) {
    throw new Error("Invalid Google token payload: missing sub or email");
  }

  // Verify issuer
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
  if (data.iss && !validIssuers.includes(data.iss)) {
    throw new Error("Invalid Google token issuer");
  }

  // Verify audience if configured
  if (expectedClientId && data.aud && data.aud !== expectedClientId) {
    throw new Error("Google token audience mismatch");
  }

  // Verify expiration
  if (data.exp) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (Number(data.exp) < nowInSeconds) {
      throw new Error("Google token has expired");
    }
  }

  // Verify email verification
  const isEmailVerified = data.email_verified === "true" || data.email_verified === true;
  if (!isEmailVerified) {
    throw new Error("Google account email is not verified");
  }

  return {
    sub: data.sub,
    email: (data.email as string).toLowerCase(),
    email_verified: true,
    name: data.name,
    given_name: data.given_name || (data.name ? data.name.split(" ")[0] : "User"),
    family_name: data.family_name || (data.name ? data.name.split(" ").slice(1).join(" ") : ""),
    picture: data.picture,
  };
}
