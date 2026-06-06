import sql from '@/app/api/utils/sql';
import { getSession } from '@/app/api/utils/auth-helper';
import * as argon2 from 'argon2';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin')
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const rows = await sql`
      SELECT id, name, username, role, phone, is_active, created_at FROM users ORDER BY role DESC, name ASC
    `;
    return Response.json({ guards: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin')
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { name, username, password, phone, role } = await request.json();
    if (!name || !username || !password) {
      return Response.json({ error: 'Field tidak lengkap' }, { status: 400 });
    }

    const hash = await argon2.hash(password);
    const rows = await sql`
      INSERT INTO users (name, username, password_hash, phone, role)
      VALUES (${name}, ${username}, ${hash}, ${phone || null}, ${role || 'guard'})
      RETURNING id, name, username, role, phone, is_active
    `;
    return Response.json({ guard: rows[0] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Username sudah digunakan' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin')
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { id, name, phone, is_active, password } = await request.json();
    if (password) {
      const hash = await argon2.hash(password);
      await sql`UPDATE users SET name=${name}, phone=${phone}, is_active=${is_active}, password_hash=${hash} WHERE id=${id}`;
    } else {
      await sql`UPDATE users SET name=${name}, phone=${phone}, is_active=${is_active} WHERE id=${id}`;
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
