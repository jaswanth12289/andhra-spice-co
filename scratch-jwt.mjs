import { SignJWT } from "jose";

async function main() {
  const secretString = process.argv[2] === "old" ? "super-secret-jwt-key" : "29f8a3d1b6e4c7d0a92b3c4f5e6a7d8c9b0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a";
  const JWT_SECRET = new TextEncoder().encode(secretString);

  const token = await new SignJWT({ userId: "123", role: "admin", email: "test@example.com" })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
    
  console.log(token);
}

main();
