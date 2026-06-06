import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/auth-helper";

function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  try {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch)
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch)
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    const placeMatch = url.match(/\/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch)
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
    const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch)
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows =
    await sql`SELECT id, name, description, lat, lng, radius_meters, checkpoint_code, is_active FROM checkpoints ORDER BY name ASC`;
  return Response.json({ checkpoints: rows });
}

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  let {
    name,
    description,
    lat,
    lng,
    radius_meters,
    checkpoint_code,
    maps_link,
  } = body;

  if (maps_link && (!lat || !lng)) {
    const coords = parseGoogleMapsLink(maps_link);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    } else
      return Response.json(
        { error: "Gagal membaca koordinat dari link Google Maps" },
        { status: 400 },
      );
  }

  if (!name || !lat || !lng || !checkpoint_code)
    return Response.json({ error: "Field tidak lengkap" }, { status: 400 });

  const rows = await sql`
    INSERT INTO checkpoints (name, description, lat, lng, radius_meters, checkpoint_code, is_active)
    VALUES (${name}, ${description || ""}, ${lat}, ${lng}, ${radius_meters || 50}, ${checkpoint_code}, true)
    RETURNING *
  `;
  return Response.json({ checkpoint: rows[0] });
}

export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  let { id, name, description, lat, lng, radius_meters, is_active, maps_link } =
    body;

  if (maps_link && (!lat || !lng)) {
    const coords = parseGoogleMapsLink(maps_link);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  await sql`
    UPDATE checkpoints SET name = ${name}, description = ${description}, lat = ${lat}, lng = ${lng}, radius_meters = ${radius_meters}, is_active = ${is_active}
    WHERE id = ${id}
  `;
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== "admin")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: "ID wajib diisi" }, { status: 400 });

  await sql`UPDATE checkpoints SET is_active = false WHERE id = ${id}`;
  return Response.json({ ok: true });
}
