'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Checkpoint {
  id: number;
  name: string;
  description: string;
  checkpoint_code: string;
  lat: number;
  lng: number;
  radius_meters: number;
  is_active: boolean;
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('patrol_token') || '' : '';
}
function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('patrol_user');
  return u ? JSON.parse(u) : null;
}

const emptyForm = {
  name: '',
  description: '',
  lat: '',
  lng: '',
  radius_meters: '50',
  checkpoint_code: '',
};

export default function CheckpointsPage() {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [origin, setOrigin] = useState('');
  const [selectedQR, setSelectedQR] = useState<Checkpoint | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') {
      router.push('/');
      return;
    }
    setOrigin(window.location.origin);
  }, [router]);

  const fetchCheckpoints = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/patrol/checkpoints', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCheckpoints(d.checkpoints || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  const handleSave = async () => {
    if (!form.name || !form.lat || !form.lng || !form.checkpoint_code) {
      alert('Nama, Kode, Lat, dan Lng wajib diisi');
      return;
    }
    setSaving(true);
    const token = getToken();
    try {
      if (editId) {
        await fetch('/api/patrol/checkpoints', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: editId,
            ...form,
            lat: parseFloat(form.lat),
            lng: parseFloat(form.lng),
            radius_meters: parseInt(form.radius_meters),
            is_active: true,
          }),
        });
      } else {
        await fetch('/api/patrol/checkpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...form,
            lat: parseFloat(form.lat),
            lng: parseFloat(form.lng),
            radius_meters: parseInt(form.radius_meters),
          }),
        });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      fetchCheckpoints();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan');
    }
    setSaving(false);
  };

  const startEdit = (cp: Checkpoint) => {
    setForm({
      name: cp.name,
      description: cp.description || '',
      lat: String(cp.lat),
      lng: String(cp.lng),
      radius_meters: String(cp.radius_meters),
      checkpoint_code: cp.checkpoint_code,
    });
    setEditId(cp.id);
    setShowForm(true);
    setSelectedQR(null);
  };

  const toggleActive = async (cp: Checkpoint) => {
    const token = getToken();
    await fetch('/api/patrol/checkpoints', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...cp, is_active: !cp.is_active }),
    });
    fetchCheckpoints();
  };

  const qrImageUrl = (code: string) => {
    const url = `${origin}/checkin/${code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
  };

  const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-blue-300 hover:text-white text-sm">
              ← Dashboard
            </Link>
            <span className="text-blue-500">/</span>
            <h1 className="text-lg font-bold">Titik Patroli</h1>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setShowForm(true);
              setSelectedQR(null);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            + Tambah Titik
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Form tambah/edit */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editId ? 'Edit Titik Patroli' : 'Tambah Titik Patroli Baru'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Nama Titik *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Pos Utama / Gerbang"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">
                  Kode Unik * (untuk QR)
                </label>
                <input
                  value={form.checkpoint_code}
                  onChange={(e) =>
                    setForm({ ...form, checkpoint_code: e.target.value.toUpperCase() })
                  }
                  placeholder="Contoh: CP007"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="-6.2088"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="106.8456"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">
                  Radius Valid (meter)
                </label>
                <input
                  type="number"
                  value={form.radius_meters}
                  onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">Keterangan</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi lokasi..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:bg-blue-400"
              >
                {saving ? 'Menyimpan...' : '💾 Simpan'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {selectedQR && origin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
              <h3 className="font-bold text-gray-800 text-lg mb-1">{selectedQR.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{selectedQR.description}</p>
              <div className="inline-block bg-blue-900 text-white font-mono font-bold px-4 py-1.5 rounded-full mb-4">
                {selectedQR.checkpoint_code}
              </div>
              <img
                src={qrImageUrl(selectedQR.checkpoint_code)}
                alt="QR Code"
                className="mx-auto rounded-lg mb-4 border border-gray-200"
              />
              <p className="text-xs text-gray-400 mb-4 break-all">
                {origin}/checkin/{selectedQR.checkpoint_code}
              </p>
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 mb-4">
                📌 Print QR ini dan tempel di titik patroli. Satpam scan dengan kamera HP.
              </p>
              <button
                onClick={() => setSelectedQR(null)}
                className="w-full border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* List checkpoints */}
        <div className="grid gap-4">
          {checkpoints.map((cp) => (
            <div
              key={cp.id}
              className={`bg-white rounded-xl shadow-sm border p-5 ${cp.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start gap-4">
                {origin && (
                  <img
                    src={qrImageUrl(cp.checkpoint_code)}
                    alt={cp.checkpoint_code}
                    className="w-20 h-20 rounded-lg border border-gray-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedQR(cp)}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{cp.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${cp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {cp.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{cp.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                      {cp.checkpoint_code}
                    </span>
                    <span className="text-xs text-gray-500">
                      📍 {Number(cp.lat).toFixed(5)}, {Number(cp.lng).toFixed(5)}
                    </span>
                    <span className="text-xs text-gray-500">Radius: {cp.radius_meters}m</span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => setSelectedQR(cp)}
                      className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium"
                    >
                      🔲 Lihat QR
                    </button>
                    <a
                      href={mapsLink(cp.lat, cp.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium"
                    >
                      🗺️ Maps
                    </a>
                    <button
                      onClick={() => startEdit(cp)}
                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => toggleActive(cp)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${cp.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                      {cp.is_active ? '⏸ Nonaktifkan' : '▶ Aktifkan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {checkpoints.length === 0 && (
            <div className="bg-white rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">📍</p>
              <p className="text-gray-500">
                Belum ada titik patroli. Klik Tambah Titik untuk mulai.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
