import sql from "@/app/api/utils/sql";
import crypto from "crypto";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 menit

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    if (!username || !pin) {
      return Response.json(
        { error: "Username dan PIN wajib diisi" },
        { status: 400 },
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return Response.json(
        { error: "PIN harus 6 digit angka" },
        { status: 400 },
      );
    }

    const rows = await sql`
      SELECT id, name, username, pin, role, phone, failed_attempts, locked_until
      FROM users WHERE username = ${username} AND is_active = true LIMIT 1
    `;

    if (!rows.length) {
      return Response.json(
        { error: "Username atau PIN salah" },
        { status: 401 },
      );
    }

    const user = rows[0];

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMin = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000,
      );
      return Response.json(
        { error: `Akun terkunci. Coba lagi dalam ${remainingMin} menit` },
        { status: 423 },
      );
    }

    if (user.pin !== pin) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION);
        await sql`UPDATE users SET failed_attempts = ${newAttempts}, locked_until = ${lockedUntil.toISOString()} WHERE id = ${user.id}`;
        return Response.json(
          { error: `PIN salah ${MAX_ATTEMPTS}x. Akun terkunci 15 menit` },
          { status: 423 },
        );
      }
      await sql`UPDATE users SET failed_attempts = ${newAttempts} WHERE id = ${user.id}`;
      return Response.json(
        { error: `PIN salah. Sisa ${MAX_ATTEMPTS - newAttempts} percobaan` },
        { status: 401 },
      );
    }

    await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt.toISOString()})`;

    return Response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
