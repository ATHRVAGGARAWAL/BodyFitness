import { verifyToken } from "@clerk/backend";

export type Authenticate = (headers: Record<string, string | string[] | undefined>) => Promise<string>;

export function createAuthenticator(): Authenticate {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const production = process.env.NODE_ENV === "production";
  return async (headers) => {
    const authorization = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (secretKey && token) {
      const payload = await verifyToken(token, { secretKey });
      if (!payload.sub) throw new Error("Token has no subject");
      return payload.sub;
    }
    if (!production) {
      const devUser = Array.isArray(headers["x-dev-user-id"]) ? headers["x-dev-user-id"]?.[0] : headers["x-dev-user-id"];
      if (devUser) return devUser;
    }
    throw new Error("Authentication required");
  };
}
