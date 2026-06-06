import sql from "@/app/api/utils/sql";

export async function POST() {
  try {
    const users =
      await sql`SELECT id, username FROM users WHERE pin IS NULL OR pin = ''`;
    const results = [];

    for (const user of users) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      await sql`UPDATE users SET pin = ${pin}, failed_attempts = 0 WHERE id = ${user.id}`;
      results.push({ username: user.username, pin });
    }

    return Response.json({
      ok: true,
      message: `PIN di-generate untuk ${results.length} user`,
      users: results,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
