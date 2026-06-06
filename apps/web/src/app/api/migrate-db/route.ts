import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'guard',
        phone VARCHAR(20),
        pin CHAR(6) DEFAULT '123456',
        is_active BOOLEAN DEFAULT true,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`;

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        token VARCHAR(100) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS checkpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        checkpoint_code VARCHAR(50) UNIQUE NOT NULL,
        location VARCHAR(200),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;

    await sql`
      CREATE TABLE IF NOT EXISTS patrol_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        checkpoint_id INTEGER REFERENCES checkpoints(id),
        checked_at TIMESTAMP DEFAULT NOW(),
        is_valid BOOLEAN DEFAULT true,
        notes TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        lat DECIMAL(10,7),
        lng DECIMAL(10,7),
        message TEXT,
        is_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS patrols (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
      )
    `;

    await sql`
      INSERT INTO users (username, name, role, pin, is_active)
      VALUES ('admin', 'Administrator', 'admin', '123456', true)
      ON CONFLICT (username) DO NOTHING
    `;

    return Response.json({
      success: true,
      message: "✅ Database berhasil di-setup lengkap!",
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
