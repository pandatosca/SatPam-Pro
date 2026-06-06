import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    // 1. Buat tabel users jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'guard',
        pin CHAR(6) DEFAULT '123456',
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 2. Buat tabel patrols jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS patrols (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      )
    `;

    // 3. Buat tabel checkpoints jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        checkpoint_code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 4. Buat tabel patrol_checkpoints jika belum ada
    await sql`
      CREATE TABLE IF NOT EXISTS patrol_checkpoints (
        id SERIAL PRIMARY KEY,
        patrol_id INTEGER REFERENCES patrols(id),
        checkpoint_id INTEGER REFERENCES checkpoints(id),
        scanned_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `;

    // 5. Insert admin default jika belum ada
    await sql`
      INSERT INTO users (username, name, role, pin)
      VALUES ('admin', 'Administrator', 'admin', '123456')
      ON CONFLICT (username) DO NOTHING
    `;

    return Response.json({
      success: true,
      message:
        "✅ Database berhasil di-setup! Admin default: username=admin, pin=123456",
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
