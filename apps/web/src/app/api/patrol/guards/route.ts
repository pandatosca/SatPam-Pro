import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/auth-helper";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const rows =
    await sql`SELECT id, name, username, pin, role, phone, is_active, created_at FROM users ORDER BY role DESC, name ASC`;
  return Response.json({ guards: rows });
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { name, username, pin, phone, role } = await request.json();
  if (!name || !username || !pin)
    return Response.json({ error: "Field tidak lengkap" }, { status: 400 });
  if (!/^\d{6}$/.test(pin))
    return Response.json({ error: "PIN harus 6 digit angka" }, { status: 400 });

  try {
    const rows = await sql`
      INSERT INTO users (name, username, pin, phone, role, is_active)
      VALUES (${name}, ${username}, ${pin}, ${phone || null}, ${role || "guard"}, true)
      RETURNING id, name, username, role, phone, is_active
    `;
    return Response.json({ guard: rows[0] });
  } catch {
    return Response.json(
      { error: "Username sudah digunakan" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id, name, phone, is_active, pin } = await request.json();
  try {
    if (pin) {
      if (!/^\d{6}$/.test(pin))
        return Response.json(
          { error: "PIN harus 6 digit angka" },
          { status: 400 },
        );
      await sql`UPDATE users SET name = ${name}, phone = ${phone}, is_active = ${is_active}, pin = ${pin} WHERE id = ${id}`;
    } else {
      await sql`UPDATE users SET name = ${name}, phone = ${phone}, is_active = ${is_active} WHERE id = ${id}`;
    }
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

  // Soft delete agar history patroli tidak rusak
  await sql`UPDATE users SET is_active = false WHERE id = ${id} AND role != 'admin'`;
  return Response.json({ ok: true });
}
