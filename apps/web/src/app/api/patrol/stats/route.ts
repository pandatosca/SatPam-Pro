import sql from '@/app/api/utils/sql';
import { getSession } from '@/app/api/utils/auth-helper';

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin')
      return Response.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const [todayLogs, totalGuards, totalCheckpoints, sosAlerts] = await sql.transaction([
      sql(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN is_valid THEN 1 END) as valid_count
         FROM patrol_logs
         WHERE DATE(checked_at AT TIME ZONE 'Asia/Jakarta') = $1`,
        [date]
      ),
      sql`SELECT COUNT(*) as total FROM users WHERE role='guard' AND is_active=true`,
      sql`SELECT COUNT(*) as total FROM checkpoints WHERE is_active=true`,
      sql`SELECT COUNT(*) as total FROM sos_alerts WHERE is_resolved=false`,
    ]);

    // Guard activity today
    const guardActivity = await sql(
      `SELECT u.id, u.name, COUNT(pl.id) as checkin_count,
              COUNT(CASE WHEN pl.is_valid THEN 1 END) as valid_count,
              MAX(pl.checked_at) as last_checkin
       FROM users u
       LEFT JOIN patrol_logs pl ON pl.user_id = u.id AND DATE(pl.checked_at AT TIME ZONE 'Asia/Jakarta') = $1
       WHERE u.role = 'guard' AND u.is_active = true
       GROUP BY u.id, u.name ORDER BY u.name`,
      [date]
    );

    return Response.json({
      today: {
        total: parseInt(todayLogs[0]?.total || '0'),
        valid: parseInt(todayLogs[0]?.valid_count || '0'),
      },
      guards: parseInt(totalGuards[0]?.total || '0'),
      checkpoints: parseInt(totalCheckpoints[0]?.total || '0'),
      sos: parseInt(sosAlerts[0]?.total || '0'),
      guardActivity,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
