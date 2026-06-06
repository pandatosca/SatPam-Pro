import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/auth-helper";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "admin")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const date =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const logs = await sql(
      `SELECT pl.id, u.name as guard_name, c.name as checkpoint_name,
              c.checkpoint_code, pl.checked_at, pl.is_valid, pl.notes,
              NULL as gps_lat, NULL as gps_lng, NULL as distance_meters
       FROM patrol_logs pl
       JOIN users u ON u.id = pl.user_id
       JOIN checkpoints c ON c.id = pl.checkpoint_id
       WHERE DATE(pl.checked_at AT TIME ZONE 'Asia/Jakarta') = $1
       ORDER BY pl.checked_at DESC
       LIMIT $2`,
      [date, limit],
    );

    return Response.json({ logs });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
