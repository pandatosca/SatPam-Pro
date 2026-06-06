// apps/web/src/app/api/utils/auth-helper.ts
import { cookies } from "next/headers";
import sql from "./sql";

// ============================================
// SERVER-SIDE: Untuk API Routes (Next.js Server)
// ============================================

export async function getSession(request?: Request) {
  try {
    let token: string | undefined;

    if (request) {
      // Ambil dari header Authorization
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    } else {
      // Ambil dari cookies (untuk Server Components)
      const cookieStore = await cookies();
      token = cookieStore.get("patrol_token")?.value;
    }

    if (!token) return null;

    const rows = await sql`
      SELECT s.*, u.name, u.username, u.role, u.phone
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;

    if (!rows.length) return null;

    return {
      token: rows[0].token,
      user_id: rows[0].user_id,
      name: rows[0].name,
      username: rows[0].username,
      role: rows[0].role,
      phone: rows[0].phone,
      expires_at: rows[0].expires_at,
    };
  } catch (err) {
    console.error("getSession error:", err);
    return null;
  }
}

export async function requireAdmin(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return null;
  }
  return session;
}

// ============================================
// CLIENT-SIDE: Untuk Browser (React Components)
// ============================================

/**
 * Ambil token dari localStorage (client-side only)
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("patrol_token");
}

/**
 * Ambil user object dari localStorage (client-side only)
 */
export function getUser(): {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string;
} | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("patrol_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Logout: hapus token dan user dari localStorage
 */
export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("patrol_token");
  localStorage.removeItem("patrol_user");
}

/**
 * Cek apakah user sudah login
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Cek apakah user adalah admin
 */
export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "admin";
}
