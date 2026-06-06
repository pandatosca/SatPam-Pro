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
  const user = localStorage.getItem("patrol_user");
  return user ? JSON.parse(user) : null;
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
    if (!u || u.role !== "admin") router.push("/");
  }, [router]);

  const fetchGuards = useCallback(async () => {
    try {
      const res = await fetch("/api/patrol/guards", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setGuards((await res.json()).guards || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  const handleSave = async () => {
    if (!form.name || !form.username)
      return setError("Nama dan username wajib diisi");
    if (!editId && !form.pin)
      return setError("PIN wajib diisi untuk user baru");
    if (form.pin && !/^\d{6}$/.test(form.pin))
      return setError("PIN harus 6 digit angka");

    setSaving(true);
    setError("");
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
      } else setError((await res.json()).error || "Gagal menyimpan");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (g: Guard) => {
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
  };

  const deleteGuard = async (g: Guard) => {
    if (!confirm(`Yakin ingin menonaktifkan ${g.name}?`)) return;
    await fetch("/api/patrol/guards", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ id: g.id }),
    });
    fetchGuards();
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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-green-300 hover:text-white text-base"
            >
              ← Dashboard
            </Link>
            <span className="text-green-500">/</span>
            <h1 className="text-xl font-bold">Kelola Satpam</h1>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setShowForm(true);
              setError("");
            }}
            className="bg-green-600 hover:bg-green-500 text-white text-base px-5 py-3 rounded-lg font-medium"
          >
            + Tambah Satpam
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editId ? "Edit Satpam" : "Tambah Satpam Baru"}
            </h2>
            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-base">
                ⚠️ {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Nama Lengkap *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  Username *
                </label>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value.toLowerCase() })
                  }
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  PIN (6 Digit) {editId ? "(Kosongkan jika tidak diubah)" : "*"}
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
                  maxLength={6}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-600 font-medium block mb-2">
                  No. HP
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3">
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
          </div>
        )}

        <div className="space-y-3">
          {guards.map((g) => (
            <div
              key={g.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 flex items-center gap-4 ${!g.is_active ? "opacity-60" : ""}`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 ${g.role === "admin" ? "bg-purple-600" : "bg-green-600"}`}
              >
                {g.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 text-lg">
                    {g.name}
                  </p>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${g.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}
                  >
                    {g.role === "admin" ? "Admin" : "Satpam"}
                  </span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${g.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {g.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  @{g.username} {g.phone && `· 📞 ${g.phone}`}
                </p>
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
                    className="text-base bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => toggleActive(g)}
                    className={`text-base px-4 py-2 rounded-lg ${g.is_active ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                  >
                    {g.is_active ? "⏸" : "▶"}
                  </button>
                  <button
                    onClick={() => deleteGuard(g)}
                    className="text-base bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100"
                  >
                    🗑️
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
