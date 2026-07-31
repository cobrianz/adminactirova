import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const ADMIN_TOKEN_COOKIE = "admin_token";

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signAdminToken(user: { _id: unknown; email: string; role: string }): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");
  return jwt.sign(
    { id: String(user._id), email: user.email, role: user.role, type: "admin" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"], issuer: "actirova-admin", audience: "actirova-admin" }
  );
}

export function verifyAdminToken(token: string): AdminUser | null {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "actirova-admin",
      audience: "actirova-admin",
    }) as jwt.JwtPayload;
    if (decoded.type !== "admin") return null;
    return {
      id: String(decoded.id),
      email: String(decoded.email || ""),
      firstName: "",
      lastName: "",
      role: String(decoded.role || "admin"),
    };
  } catch {
    return null;
  }
}

export function readAdminToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_TOKEN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function adminTokenCookie(token: string): string {
  return `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearAdminTokenCookie(): string {
  return `${ADMIN_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
