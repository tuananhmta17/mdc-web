import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, encoded?: string): boolean {
  if (!encoded?.startsWith("scrypt:")) return false;
  const [, salt, digest] = encoded.split(":");
  if (!salt || !digest || digest.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(digest, "hex"), actual);
}
export function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function newToken(): string { return randomBytes(32).toString("base64url"); }
export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
