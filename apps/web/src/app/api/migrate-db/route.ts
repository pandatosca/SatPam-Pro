// apps/web/src/app/api/migrate-db/route.ts
import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    // 1. Tambah kolom pin jika belum ada (default '123456')
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS pin CHAR(6) DEFAULT '123456',
      ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP
    `;

    // 2. Update user yang sudah ada agar punya PIN default
    await sql`
      UPDATE users 
      SET pin = '123456', failed_attempts = 0 
      WHERE pin IS NULL OR pin = ''
    `;

    return Response.json({
      success: true,
      message: "✅ Database berhasil di-update! Kolom PIN sudah ditambahkan.",
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
