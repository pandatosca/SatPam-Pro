"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  LogOut,
  Plus,
  ShieldCheck,
  UsersRound,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from "lucide-react";

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

  const activeGuards = guards.filter((g) => g.is_active && g.role !== "admin");
  const adminUsers = guards.filter((g) => g.role === "admin");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent mx-auto mb-3" />
          <p className="text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header — konsisten dengan dashboard */}
      <header className="sticky top-0 z-10 border-b border-green-700 bg-green-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6 text-emerald-100" />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-green-300 hover:text-white text-sm font-medium flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <span className="text-green-600">/</span>
              <h1 className="text-base font-bold">Kelola Satpam</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
                setShowForm(true);
                setError("");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Satpam</span>
              <span className="sm:hidden">Tambah</span>
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Satpam Aktif",
              value: activeGuards.length,
              color: "text-emerald-700",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
              icon: UsersRound,
            },
            {
              label: "Admin",
              value: adminUsers.length,
              color: "text-violet-700",
              bg: "bg-violet-50",
              border: "border-violet-100",
              icon: ShieldAlert,
            },
            {
              label: "Total Akun",
              value: guards.length,
              color: "text-slate-700",
              bg: "bg-slate-50",
              border: "border-slate-100",
              icon: KeyRound,
            },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={`${c.bg} rounded-2xl border ${c.border} p-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {c.label}
                    </p>
                    <p className={`mt-2 text-3xl font-bold ${c.color}`}>
                      {c.value}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2 ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editId ? "✏️ Edit Satpam" : "➕ Tambah Satpam Baru"}
            </h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                ⚠️ {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  label: "Nama Lengkap *",
                  key: "name",
                  placeholder: "Budi Santoso",
                },
                { label: "Username *", key: "username", placeholder: "budi" },
                {
                  label: `PIN (6 Digit)${editId ? " — kosongkan jika tidak diubah" : " *"}`,
                  key: "pin",
                  placeholder: "123456",
                },
                { label: "No. HP", key: "phone", placeholder: "08123456789" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
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
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
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
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm px-5 py-2.5 rounded-lg"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-700">
            Daftar Satpam ({activeGuards.length} Aktif)
          </h2>
          {guards.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
              <UsersRound className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500">
                Belum ada satpam. Klik "Tambah Satpam" untuk mulai.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {guards.map((g) => (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${g.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0 ${g.role === "admin" ? "bg-violet-600" : "bg-green-600"}`}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800 text-sm">
                          {g.name}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}
                        >
                          {g.role === "admin" ? "Admin" : "Satpam"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {g.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>@{g.username}</span>
                        {g.phone && <span>📱 {g.phone}</span>}
                        {g.pin && <span>🔑 PIN: {g.pin}</span>}
                      </div>
                    </div>
                    {g.role !== "admin" && (
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
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
                          className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-medium"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => toggleActive(g)}
                          className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium ${g.is_active ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                        >
                          {g.is_active ? (
                            <ToggleLeft className="h-3 w-3" />
                          ) : (
                            <ToggleRight className="h-3 w-3" />
                          )}
                          {g.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => deleteGuard(g)}
                          className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium"
                        >
                          <Trash2 className="h-3 w-3" /> Hapus
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
