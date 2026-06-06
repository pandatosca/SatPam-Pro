// apps/web/src/app/api/utils/migrate-pin.ts
import sql from "./sql";

export async function migrateToPin() {
  try {
    // Tambah kolom pin jika belum ada
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pin CHAR(6),
      ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP
    `;

    // Generate PIN default 6 digit untuk semua user
    const users = await sql`SELECT id FROM users WHERE pin IS NULL`;

    for (const user of users) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      await sql`UPDATE users SET pin = ${pin} WHERE id = ${user.id}`;
      console.log(`User ${user.id} → PIN: ${pin}`);
    }

    console.log("✅ Migration to PIN completed");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
}
