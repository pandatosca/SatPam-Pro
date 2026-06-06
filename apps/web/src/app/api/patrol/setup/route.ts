import sql from '@/app/api/utils/sql';
import * as argon2 from 'argon2';

// One-time setup: hash default password for all seeded users
export async function POST() {
  try {
    const hash = await argon2.hash('password123');
    await sql`UPDATE users SET password_hash = ${hash} WHERE password_hash LIKE '$argon2id%'`;
    return Response.json({ ok: true, message: 'Password reset ke password123 untuk semua user' });
  } catch (err) {
    console.error(err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
