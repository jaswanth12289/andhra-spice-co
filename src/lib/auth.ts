import { jwtVerify, SignJWT } from "jose";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "super-secret-jwt-key") {
  throw new Error("Missing or insecure required environment variable: JWT_SECRET");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
export async function signToken(payload: { userId: string, role: string, email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
