'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Guard {
  id: number;
  name: string;
  username: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('patrol_token') || '' : '';
}
function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('patrol_user');
  return u ? JSON.parse(u) : null;
}

const emptyForm = { name: '', username: '', password: '', phone: '', role: 'guard' };

export default function GuardsPage() {
  const router = useRouter();
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [router]);

  const fetchGuards = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch('/api/patrol/guards', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setGuards(d.guards || []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.username) {
      setError('Nama dan username wajib diisi');
      return;
    }
    if (!editId && !form.password) {
      setError('Password wajib untuk user baru');
      return;
    }
    setSaving(true);
    const token = getToken();
    try {
      if (editId) {
        const res = await fetch('/api/patrol/guards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: editId,
            name: form.name,
            phone: form.phone,
            is_active: true,
            password: form.password || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || 'Gagal update');
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch('/api/patrol/guards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || 'Gagal tambah');
          setSaving(false);
          return;
        }
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      fetchGuards();
    } catch {
      setError('Terjadi kesalahan');
    }
    setSaving(false);
  };

  const startEdit = (g: Guard) => {
    setForm({
      name: g.name,
      username: g.username,
      password: '',
      phone: g.phone || '',
      role: g.role,
    });
    setEditId(g.id);
    setShowForm(true);
    setError('');
  };

  const toggleActive = async (g: Guard) => {
    const token = getToken();
    await fetch('/api/patrol/guards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: g.id, name: g.name, phone: g.phone, is_active: !g.is_active }),
    });
    fetchGuards();
  };

  const activeGuards = guards.filter((g) => g.is_active && g.role === 'guard');
  const inactiveGuards = guards.filter((g) => !g.is_active && g.role === 'guard');

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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-blue-300 hover:text-white text-sm">
              ← Dashboard
            </Link>
            <span className="text-blue-500">/</span>
            <h1 className="text-lg font-bold">Kelola Satpam</h1>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setShowForm(true);
              setError('');
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            + Tambah Satpam
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editId ? 'Edit Data Satpam' : 'Tambah Satpam Baru'}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">
                  Nama Lengkap *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama satpam"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">
                  Username * {editId && '(tidak bisa diubah)'}
                </label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="username"
                  disabled={!!editId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">
                  Password {editId && '(kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editId ? 'Biarkan kosong jika tidak diubah' : 'Password baru'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium block mb-1">No. HP</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
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
                  setError('');
                }}
                className="border border-gray-300 text-gray-600 px-6 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{guards.length}</p>
            <p className="text-xs text-gray-500">Total Akun</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{activeGuards.length}</p>
            <p className="text-xs text-gray-500">Satpam Aktif</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-400">{inactiveGuards.length}</p>
            <p className="text-xs text-gray-500">Nonaktif</p>
          </div>
        </div>

        {/* Guards list */}
        <div className="space-y-3">
          {guards.map((g) => (
            <div
              key={g.id}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 ${!g.is_active ? 'opacity-60' : ''}`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${g.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`}
              >
                {g.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800">{g.name}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${g.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {g.role === 'admin' ? 'Admin' : 'Satpam'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${g.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {g.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  @{g.username} {g.phone && `· 📞 ${g.phone}`}
                </p>
              </div>
              {g.role !== 'admin' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(g)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => toggleActive(g)}
                    className={`text-xs px-3 py-1.5 rounded-lg ${g.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                  >
                    {g.is_active ? '⏸' : '▶'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
