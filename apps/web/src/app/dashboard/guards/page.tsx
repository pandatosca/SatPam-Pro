"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, getToken, logout } from "@/app/api/utils/auth-helper";

interface Guard {
  id: number;
  name: string;
  username: string;
  pin?: string;
  role: string;
  phone?: string;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  username: "",
  pin: "",
  phone: "",
  role: "guard",
};

export default function GuardsPage() {
  const router = useRouter();
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.push("/");
      return;
    }
  }, [router]);

  const fetchGuards = useCallback(async () => {
    try {
      const res = await fetch("/api/patrol/guards", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGuards(data.guards || []);
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
    setError("");

    if (!form.name || !form.username) {
      setError("Nama dan username wajib diisi");
      return;
    }
    if (!editId && !form.pin) {
      setError("PIN wajib diisi untuk user baru");
      return;
    }
    if (form.pin && !/^\d{6}$/.test(form.pin)) {
      setError("PIN harus 6 digit angka");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/patrol/guards", {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });

      if (res.ok) {
        setShowForm(false);
        setForm(emptyForm);
        setEditId(null);
        fetchGuards();
      } else {
        const data = await res.json();
        setError(data.error || "Gagal menyimpan");
      }
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (g: Guard) => {
    try {
      await fetch("/api/patrol/guards", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          id: g.id,
          name: g.name,
          phone: g.phone,
          is_active: !g.is_active,
        }),
      });
      fetchGuards();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGuard = async (g: Guard) => {
    if (!confirm(`Yakin ingin menonaktifkan ${g.name}?`)) return;
    try {
      await fetch("/api/patrol/guards", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id: g.id }),
      });
      fetchGuards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (confirm("Yakin ingin logout?")) {
      logout();
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Memuat data...</p>
        </div>
      </div>
    );
  }

  const activeGuards = guards.filter((g) => g.is_active && g.role !== "admin");
  const adminUsers = guards.filter((g) => g.role === "admin");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Rapi & Konsisten */}
      <header className="bg-linear-to-r from-green-900 to-green-800 text-white shadow-lg print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-green-200 hover:text-white text-lg font-medium transition-colors"
              >
                ← Dashboard
              </Link>
              <span className="text-green-400 text-xl">/</span>
              <h1 className="text-2xl font-bold text-white">Kelola Satpam</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white text-base font-semibold px-6 py-3 rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
              <button
                onClick={() => {
                  setForm(emptyForm);
                  setEditId(null);
                  setShowForm(true);
                  setError("");
                }}
                className="bg-green-600 hover:bg-green-500 text-white text-base font-semibold px-6 py-3 rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                <span>+</span>
                <span>Tambah Satpam</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-green-100">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 text-green-700 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                👮
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Total Satpam Aktif
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {activeGuards.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-purple-100">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 text-purple-700 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                👑
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Admin</p>
                <p className="text-3xl font-bold text-gray-800">
                  {adminUsers.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 text-gray-700 w-14 h-14 rounded-full flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Akun</p>
                <p className="text-3xl font-bold text-gray-800">
                  {guards.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-green-100 text-green-700 w-10 h-10 rounded-full flex items-center justify-center text-lg">
                {editId ? "✏️" : "+"}
              </span>
              {editId ? "Edit Satpam" : "Tambah Satpam Baru"}
            </h2>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-5 py-4 rounded-lg mb-6 text-base font-medium flex items-center gap-2">
                <span>️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-base text-gray-700 font-semibold block mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>

              <div>
                <label className="text-base text-gray-700 font-semibold block mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value.toLowerCase() })
                  }
                  placeholder="Contoh: budi"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>

              <div>
                <label className="text-base text-gray-700 font-semibold block mb-2">
                  PIN (6 Digit){" "}
                  {editId ? (
                    "(Kosongkan jika tidak diubah)"
                  ) : (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.pin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  placeholder="123456"
                  maxLength={6}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-mono font-bold text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 PIN digunakan untuk login cepat di HP
                </p>
              </div>

              <div>
                <label className="text-base text-gray-700 font-semibold block mb-2">
                  No. HP
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="08123456789"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t-2 border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-lg font-semibold px-8 py-4 rounded-lg shadow-lg transition-all flex items-center gap-2"
              >
                <span>{saving ? "⏳" : "💾"}</span>
                <span>{saving ? "Menyimpan..." : "Simpan"}</span>
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                  setError("");
                }}
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg font-semibold px-8 py-4 rounded-lg transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* List Satpam */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center">
              👮
            </span>
            Daftar Satpam ({activeGuards.length} Aktif)
          </h2>

          {guards.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
              <div className="text-7xl mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Belum Ada Satpam
              </h3>
              <p className="text-gray-500 mb-6">
                Klik tombol "Tambah Satpam" di atas untuk membuat akun pertama
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {guards.map((g) => (
                <div
                  key={g.id}
                  className={`bg-white rounded-xl shadow-md border-2 p-6 transition-all hover:shadow-lg ${
                    g.is_active
                      ? "border-green-200"
                      : "border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md ${
                        g.role === "admin" ? "bg-purple-600" : "bg-green-600"
                      }`}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="font-bold text-gray-800 text-xl">
                          {g.name}
                        </h3>
                        <span
                          className={`text-sm px-3 py-1 rounded-full font-semibold ${
                            g.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {g.role === "admin" ? "👑 Admin" : "👮 Satpam"}
                        </span>
                        <span
                          className={`text-sm px-3 py-1 rounded-full font-semibold ${
                            g.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {g.is_active ? "✓ Aktif" : "✗ Nonaktif"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <span>👤</span>
                          <span className="font-mono">@{g.username}</span>
                        </span>
                        {g.phone && (
                          <span className="text-gray-600 flex items-center gap-1">
                            <span>📞</span>
                            <span>{g.phone}</span>
                          </span>
                        )}
                        {g.pin && (
                          <span className="text-gray-600 flex items-center gap-1">
                            <span>🔐</span>
                            <span className="font-mono">PIN: {g.pin}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {g.role !== "admin" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setForm({
                              name: g.name,
                              username: g.username,
                              pin: "",
                              phone: g.phone || "",
                              role: g.role,
                            });
                            setEditId(g.id);
                            setShowForm(true);
                            setError("");
                          }}
                          className="text-base bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => toggleActive(g)}
                          className={`text-base px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                            g.is_active
                              ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          <span>{g.is_active ? "⏸" : "▶"}</span>
                          <span>
                            {g.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteGuard(g)}
                          className="text-base bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
