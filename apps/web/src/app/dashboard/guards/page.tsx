"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Guard {
  id: number;
  name: string;
  username: string;
  pin?: string;
  role: string;
  phone?: string;
  is_active: boolean;
}

const emptyForm = { name: "", username: "", pin: "", phone: "", role: "guard" };

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("patrol_token") || ""
    : "";
}
function getUser() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("patrol_user");
  return u ? JSON.parse(u) : null;
}

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

  const logout = () => {
    localStorage.removeItem("patrol_token");
    localStorage.removeItem("patrol_user");
    router.push("/");
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
      {/* Header */}
      <header className="bg-green-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-green-200 hover:text-white text-base font-medium transition-colors"
            >
              ← Dashboard
            </Link>
            <span className="text-green-500">/</span>
            <h1 className="text-xl font-bold">Kelola Satpam</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
                setShowForm(true);
                setError("");
              }}
              className="bg-green-600 hover:bg-green-500 text-white text-base font-semibold px-5 py-2.5 rounded-lg transition-all"
            >
              + Tambah Satpam
            </button>
            <button
              onClick={logout}
              className="text-green-300 hover:text-white text-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Satpam Aktif",
              value: activeGuards.length,
              color: "text-green-700",
              bg: "bg-green-50",
              border: "border-green-100",
            },
            {
              label: "Admin",
              value: adminUsers.length,
              color: "text-purple-700",
              bg: "bg-purple-50",
              border: "border-purple-100",
            },
            {
              label: "Total Akun",
              value: guards.length,
              color: "text-gray-700",
              bg: "bg-gray-50",
              border: "border-gray-100",
            },
          ].map((c) => (
            <div
              key={c.label}
              className={`${c.bg} rounded-xl p-5 border ${c.border} shadow-sm`}
            >
              <p className="text-sm text-gray-500 font-medium mb-1">
                {c.label}
              </p>
              <p className={`text-4xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-5">
              {editId ? "✏️ Edit Satpam" : "➕ Tambah Satpam Baru"}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-base">
                ⚠️ {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  label: "Nama Lengkap *",
                  key: "name",
                  placeholder: "Budi Santoso",
                },
                { label: "Username *", key: "username", placeholder: "budi" },
                {
                  label: `PIN (6 Digit)${editId ? " - kosongkan jika tidak diubah" : " *"}`,
                  key: "pin",
                  placeholder: "123456",
                },
                { label: "No. HP", key: "phone", placeholder: "08123456789" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-sm text-gray-700 font-semibold block mb-1.5">
                    {label}
                  </label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (key === "username") val = val.toLowerCase();
                      if (key === "pin")
                        val = val.replace(/\D/g, "").slice(0, 6);
                      setForm({ ...form, [key]: val });
                    }}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-base font-semibold px-6 py-3 rounded-lg transition-all"
              >
                {saving ? "Menyimpan..." : "💾 Simpan"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                  setError("");
                }}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 text-base px-6 py-3 rounded-lg transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">
            Daftar Satpam ({activeGuards.length} Aktif)
          </h2>
          {guards.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
              <p className="text-gray-500 text-base">
                Belum ada satpam. Klik "Tambah Satpam" untuk mulai.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {guards.map((g) => (
                <div
                  key={g.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md ${g.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 ${g.role === "admin" ? "bg-purple-600" : "bg-green-600"}`}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-800 text-base">
                          {g.name}
                        </h3>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${g.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}
                        >
                          {g.role === "admin" ? "Admin" : "Satpam"}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${g.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {g.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        <span>@{g.username}</span>
                        {g.phone && <span>📱 {g.phone}</span>}
                        {g.pin && <span>🔑 PIN: {g.pin}</span>}
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
                          className="text-sm bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => toggleActive(g)}
                          className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors ${g.is_active ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                        >
                          {g.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => deleteGuard(g)}
                          className="text-sm bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-lg font-medium transition-colors"
                        >
                          🗑️ Hapus
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
