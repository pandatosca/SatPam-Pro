"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Checkpoint {
  id: number;
  name: string;
  description?: string;
  lat: string;
  lng: string;
  radius_meters: number;
  checkpoint_code: string;
  is_active: boolean;
}
const emptyForm = {
  name: "",
  description: "",
  lat: "",
  lng: "",
  radius_meters: "50",
  checkpoint_code: "",
  maps_link: "",
};

function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  try {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch)
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch)
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    return null;
  } catch {
    return null;
  }
}

function qrImageUrl(code: string, origin: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${origin}/checkin/${code}`)}`;
}

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("patrol_token") || ""
    : "";
}

function getUser() {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("patrol_user");
  return user ? JSON.parse(user) : null;
}

export default function CheckpointsPage() {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedQR, setSelectedQR] = useState<Checkpoint | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") router.push("/");
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, [router]);

  const fetchCheckpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/patrol/checkpoints", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setCheckpoints((await res.json()).checkpoints || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  const handleSave = async () => {
    if (!form.name || !form.checkpoint_code)
      return alert("Nama dan kode unik wajib diisi");

    let lat = form.lat,
      lng = form.lng;
    if (form.maps_link && (!lat || !lng)) {
      const coords = parseGoogleMapsLink(form.maps_link);
      if (coords) {
        lat = coords.lat.toString();
        lng = coords.lng.toString();
      } else return alert("Tidak bisa membaca koordinat dari link Google Maps");
    }
    if (!lat || !lng) return alert("Latitude dan Longitude wajib diisi");

    setSaving(true);
    try {
      const res = await fetch("/api/patrol/checkpoints", {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(
          editId ? { id: editId, ...form, lat, lng } : { ...form, lat, lng },
        ),
      });
      if (res.ok) {
        setShowForm(false);
        setForm(emptyForm);
        setEditId(null);
        fetchCheckpoints();
      } else alert((await res.json()).error || "Gagal menyimpan");
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cp: Checkpoint) => {
    await fetch("/api/patrol/checkpoints", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        id: cp.id,
        name: cp.name,
        description: cp.description,
        lat: cp.lat,
        lng: cp.lng,
        radius_meters: cp.radius_meters,
        is_active: !cp.is_active,
      }),
    });
    fetchCheckpoints();
  };

  const deleteCheckpoint = async (cp: Checkpoint) => {
    if (!confirm(`Yakin ingin menonaktifkan ${cp.name}?`)) return;
    await fetch("/api/patrol/checkpoints", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ id: cp.id }),
    });
    fetchCheckpoints();
  };

  const printAllQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `
      <!DOCTYPE html><html><head><title>QR Code Titik Patroli</title>
      <style>
        @page { size: A4; margin: 1cm; }
        body { font-family: Arial, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2cm; }
        .item { text-align: center; page-break-inside: avoid; border: 2px dashed #ccc; padding: 20px; }
        .item img { width: 180px; height: 180px; }
        .item h3 { margin: 15px 0 5px; font-size: 20px; }
        .item p { margin: 0; font-size: 14px; color: #666; }
      </style></head><body>
      <h1 style="text-align: center; margin-bottom: 2cm;">QR Code Titik Patroli (Tempel di Lokasi)</h1>
      <div class="grid">
        ${checkpoints
          .filter((cp) => cp.is_active)
          .map(
            (cp) => `
          <div class="item">
            <img src="${qrImageUrl(cp.checkpoint_code, origin)}" alt="${cp.checkpoint_code}" />
            <h3>${cp.name}</h3>
            <p>Kode: <strong>${cp.checkpoint_code}</strong></p>
            <p>${Number(cp.lat).toFixed(5)}, ${Number(cp.lng).toFixed(5)}</p>
          </div>
        `,
          )
          .join("")}
      </div></body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Memuat...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-900 text-white shadow-lg print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-green-300 hover:text-white text-base"
            >
              ← Dashboard
            </Link>
            <span className="text-green-500">/</span>
            <h1 className="text-xl font-bold">Titik Patroli</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={printAllQR}
              className="bg-white text-green-700 text-base px-5 py-3 rounded-lg font-medium hover:bg-green-50"
            >
              🖨️ Cetak Semua QR
            </button>
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
                setShowForm(true);
                setSelectedQR(null);
              }}
              className="bg-green-600 hover:bg-green-500 text-white text-base px-5 py-3 rounded-lg font-medium"
            >
              + Tambah Titik
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6 print:hidden">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editId ? "Edit Titik Patroli" : "Tambah Titik Patroli Baru"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Nama Titik *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Kode Unik * (untuk QR)
                </label>
                <input
                  value={form.checkpoint_code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      checkpoint_code: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={10}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-mono focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-base text-gray-600 font-medium block mb-2">
                  🗺️ Link Google Maps (Auto-fill Lat/Lng)
                </label>
                <input
                  value={form.maps_link}
                  onChange={(e) =>
                    setForm({ ...form, maps_link: e.target.value })
                  }
                  placeholder="Paste link Google Maps di sini..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  💡 Paste link, koordinat akan otomatis terisi
                </p>
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Radius Valid (meter)
                </label>
                <input
                  type="number"
                  value={form.radius_meters}
                  onChange={(e) =>
                    setForm({ ...form, radius_meters: e.target.value })
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Keterangan
                </label>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-base px-6 py-3 rounded-lg font-medium disabled:bg-green-400"
              >
                {saving ? "Menyimpan..." : "💾 Simpan"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
                className="border-2 border-gray-300 text-gray-600 text-base px-6 py-3 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {checkpoints.map((cp) => (
            <div
              key={cp.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 ${cp.is_active ? "border-gray-100" : "border-gray-200 opacity-60"}`}
            >
              <div className="flex items-start gap-4">
                {origin && (
                  <img
                    src={qrImageUrl(cp.checkpoint_code, origin)}
                    alt={cp.checkpoint_code}
                    className="w-24 h-24 rounded-lg border-2 border-gray-200 shrink-0 cursor-pointer hover:opacity-80"
                    onClick={() => setSelectedQR(cp)}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {cp.name}
                    </h3>
                    <span
                      className={`text-sm px-2 py-1 rounded-full font-medium ${cp.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {cp.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{cp.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="font-mono text-base font-bold text-green-700 bg-green-50 px-3 py-1 rounded">
                      {cp.checkpoint_code}
                    </span>
                    <span className="text-sm text-gray-500">
                      📍 {Number(cp.lat).toFixed(5)},{" "}
                      {Number(cp.lng).toFixed(5)}
                    </span>
                    <span className="text-sm text-gray-500">
                      Radius: {cp.radius_meters}m
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => setSelectedQR(cp)}
                      className="text-base bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-medium"
                    >
                      🔲 QR
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${cp.lat},${cp.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-medium"
                    >
                      🗺️ Maps
                    </a>
                    <button
                      onClick={() => {
                        setForm({
                          name: cp.name,
                          description: cp.description || "",
                          lat: cp.lat,
                          lng: cp.lng,
                          radius_meters: cp.radius_meters.toString(),
                          checkpoint_code: cp.checkpoint_code,
                          maps_link: "",
                        });
                        setEditId(cp.id);
                        setShowForm(true);
                      }}
                      className="text-base bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleActive(cp)}
                      className={`text-base px-4 py-2 rounded-lg font-medium ${cp.is_active ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                    >
                      {cp.is_active ? "⏸" : "▶"}
                    </button>
                    <button
                      onClick={() => deleteCheckpoint(cp)}
                      className="text-base bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 font-medium"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {checkpoints.length === 0 && (
            <div className="bg-white rounded-xl p-10 text-center">
              <p className="text-5xl mb-3">📍</p>
              <p className="text-gray-500 text-lg">Belum ada titik patroli.</p>
            </div>
          )}
        </div>
      </div>

      {selectedQR && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 print:hidden"
          onClick={() => setSelectedQR(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              {selectedQR.name}
            </h3>
            <div className="flex justify-center mb-4">
              <img
                src={qrImageUrl(selectedQR.checkpoint_code, origin)}
                alt={selectedQR.checkpoint_code}
                className="w-64 h-64"
              />
            </div>
            <p className="text-center text-gray-600 mb-2">
              Kode:{" "}
              <span className="font-mono font-bold">
                {selectedQR.checkpoint_code}
              </span>
            </p>
            <button
              onClick={() => setSelectedQR(null)}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3 rounded-lg font-medium mt-4"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
