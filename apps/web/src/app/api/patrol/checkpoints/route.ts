import sql from '@/app/api/utils/sql';
import { getSession } from '@/app/api/utils/auth-helper';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT id, name, description, lat, lng, radius_meters, checkpoint_code, is_active
      FROM checkpoints ORDER BY name ASC
    `;
    return Response.json({ checkpoints: rows });
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

    const { name, description, lat, lng, radius_meters, checkpoint_code } = await request.json();
    if (!name || !lat || !lng || !checkpoint_code) {
      return Response.json({ error: 'Field tidak lengkap' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO checkpoints (name, description, lat, lng, radius_meters, checkpoint_code)
      VALUES (${name}, ${description || ''}, ${lat}, ${lng}, ${radius_meters || 50}, ${checkpoint_code})
      RETURNING *
    `;
    return Response.json({ checkpoint: rows[0] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin')
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { id, name, description, lat, lng, radius_meters, is_active } = await request.json();
    await sql`
      UPDATE checkpoints SET
        name = ${name}, description = ${description}, lat = ${lat},
        lng = ${lng}, radius_meters = ${radius_meters}, is_active = ${is_active}
      WHERE id = ${id}
    `;
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
