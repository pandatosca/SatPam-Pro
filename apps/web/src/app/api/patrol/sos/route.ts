import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/auth-helper";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const rows = await sql`
      SELECT sa.*, u.name as guard_name
      FROM sos_alerts sa
      JOIN users u ON u.id = sa.user_id
      ORDER BY sa.created_at DESC LIMIT 50
    `;
    return Response.json({ alerts: rows });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { lat, lng, message } = await request.json();
    await sql`
      INSERT INTO sos_alerts (user_id, lat, lng, message)
      VALUES (${session.user_id}, ${lat || null}, ${lng || null}, ${message || "DARURAT! Butuh bantuan segera."})
    `;
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await request.json();
    await sql`UPDATE sos_alerts SET is_resolved = true WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

