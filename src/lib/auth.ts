import { jwtVerify, SignJWT } from "jose";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "super-secret-jwt-key") {
    throw new Error("Missing or insecure required environment variable: JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: { userId: string, role: string, email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch (error) {
    return null;
  }
}
