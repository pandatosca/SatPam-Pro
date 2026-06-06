"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface GuardActivity {
  id: number;
  name: string;
  checkin_count: number;
  valid_count: number;
  last_checkin: string | null;
}
interface Stats {
  today: { total: number; valid: number };
  guards: number;
  checkpoints: number;
  sos: number;
  guardActivity: GuardActivity[];
}
interface Log {
  id: number;
  guard_name: string;
  checkpoint_name: string;
  checkpoint_code: string;
  checked_at: string;
  gps_lat: number;
  gps_lng: number;
  distance_meters: number;
  is_valid: boolean;
  notes: string;
}
interface SosAlert {
  id: number;
  guard_name: string;
  message: string;
  created_at: string;
  lat: number;
  lng: number;
  is_resolved: boolean;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    role: string;
    username: string;
  } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "sos">(
    "overview",
  );
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [pinMsg, setPinMsg] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  const fetchAll = useCallback(
    async (date: string) => {
      if (!date) return;
      const token = getToken();
      if (!token) {
        router.push("/");
        return;
      }
      try {
        const [statsRes, logsRes, sosRes] = await Promise.all([
          fetch(`/api/patrol/stats?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/patrol/logs?date=${date}&limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/patrol/sos", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (logsRes.ok) {
          const d = await logsRes.json();
          setLogs(d.logs || []);
        }
        if (sosRes.ok) {
          const d = await sosRes.json();
          setSosAlerts(d.alerts || []);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.push("/");
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!selectedDate) return;
    fetchAll(selectedDate);
    const interval = setInterval(() => fetchAll(selectedDate), 30000);
    return () => clearInterval(interval);
  }, [selectedDate, fetchAll]);

  const resolvesSos = async (id: number) => {
    const token = getToken();
    await fetch("/api/patrol/sos", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });
    if (selectedDate) fetchAll(selectedDate);
  };

  const logout = () => {
    localStorage.removeItem("patrol_token");
    localStorage.removeItem("patrol_user");
    router.push("/");
  };

  const handleChangePin = async () => {
    setPinMsg("");
    if (!/^\d{6}$/.test(pinForm.newPin)) {
      setPinMsg("PIN baru harus 6 digit angka");
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinMsg("Konfirmasi PIN tidak cocok");
      return;
    }
    setPinLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/patrol/guards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPin: pinForm.oldPin,
          newPin: pinForm.newPin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPinMsg("✅ PIN berhasil diganti!");
        setTimeout(() => {
          setShowPinModal(false);
          setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
          setPinMsg("");
        }, 1500);
      } else {
        setPinMsg(data.error || "Gagal ganti PIN");
      }
    } catch {
      setPinMsg("Terjadi kesalahan");
    }
    setPinLoading(false);
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return "--:--";
    const m = isoStr.match(/T(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : "--:--";
  };
  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return "--";
    const m = isoStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return "--";
    const months = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agt",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${m[3]} ${months[parseInt(m[2])]} ${m[4]}:${m[5]}`;
  };

  const pendingSos = sosAlerts.filter((s) => !s.is_resolved);

  if (loading && !selectedDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h1 className="text-base font-bold leading-tight">SatPam Pro</h1>
              <p className="text-green-300 text-xs">Dashboard Admin</p>
            </div>
          </div>
          {/* Nav kanan */}
          <div className="flex items-center gap-3">
            {pendingSos.length > 0 && (
              <button
                onClick={() => setActiveTab("sos")}
                className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse"
              >
                🚨 {pendingSos.length}
              </button>
            )}
            <Link
              href="/dashboard/checkpoints"
              className="hidden md:block text-green-200 hover:text-white text-base"
            >
              📍 Checkpoint
            </Link>
            <Link
              href="/dashboard/guards"
              className="hidden md:block text-green-200 hover:text-white text-sm"
            >
              👮 Satpam
            </Link>
            <button
              onClick={() => setShowPinModal(true)}
              className="bg-green-700 hover:bg-green-600 text-white text-xs px-2.5 py-1.5 rounded-lg border border-green-600"
            >
              🔑 PIN
            </button>
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <button
                onClick={logout}
                className="text-green-300 hover:text-white text-xs"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">Laporan Patroli</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={() => fetchAll(selectedDate)}
              className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-800 whitespace-nowrap"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Check-in",
              value: stats?.today.total || 0,
              sub: `${stats?.today.valid || 0} valid`,
              color: "text-green-700",
              bg: "bg-green-50",
            },
            {
              label: "Satpam",
              value: stats?.guards || 0,
              sub: "Aktif",
              color: "text-blue-700",
              bg: "bg-blue-50",
            },
            {
              label: "Checkpoint",
              value: stats?.checkpoints || 0,
              sub: "Titik patroli",
              color: "text-purple-700",
              bg: "bg-purple-50",
            },
            {
              label: "SOS Alert",
              value: stats?.sos || 0,
              sub: "Belum selesai",
              color: (stats?.sos || 0) > 0 ? "text-red-600" : "text-gray-400",
              bg: (stats?.sos || 0) > 0 ? "bg-red-50" : "bg-gray-50",
            },
          ].map((c) => (
            <div
              key={c.label}
              className={`${c.bg} rounded-xl p-4 border border-white shadow-sm`}
            >
              <p className="text-xs text-gray-500 font-medium mb-1">
                {c.label}
              </p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["overview", "logs", "sos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${activeTab === tab ? "bg-green-50 text-green-800 border-b-2 border-green-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                {tab === "overview" && "📊 Aktivitas"}
                {tab === "logs" && `📋 Log (${logs.length})`}
                {tab === "sos" && `🚨 SOS (${pendingSos.length})`}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="p-3 sm:p-4">
              <div className="grid gap-2">
                {(stats?.guardActivity || []).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-800 font-bold text-sm shrink-0">
                      {g.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {g.name}
                      </p>
                      <p
                        className="text-xs text-gray-400"
                        suppressHydrationWarning
                      >
                        {g.last_checkin
                          ? formatTime(g.last_checkin)
                          : "Belum patroli"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-green-700">
                        {g.checkin_count}
                      </p>
                      <p className="text-xs text-gray-400">
                        {g.valid_count} valid
                      </p>
                    </div>
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${g.checkin_count > 0 ? "bg-green-400" : "bg-gray-300"}`}
                    />
                  </div>
                ))}
                {(!stats?.guardActivity ||
                  stats.guardActivity.length === 0) && (
                  <p className="text-center text-gray-400 py-8 text-sm">
                    Belum ada data untuk tanggal ini
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-125">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Waktu", "Satpam", "Checkpoint", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td
                        className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap"
                        suppressHydrationWarning
                      >
                        {formatDateTime(log.checked_at)}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-800 text-xs">
                        {log.guard_name}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className="text-gray-800">
                          {log.checkpoint_name}
                        </span>
                        <span className="ml-1 text-gray-400">
                          ({log.checkpoint_code})
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${log.is_valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {log.is_valid ? "✓ Valid" : "✗ Invalid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-10 text-gray-400 text-sm"
                      >
                        Tidak ada log untuk tanggal ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "sos" && (
            <div className="p-3 sm:p-4 space-y-2">
              {sosAlerts.map((sos) => (
                <div
                  key={sos.id}
                  className={`p-3 rounded-lg border flex items-start gap-3 ${sos.is_resolved ? "bg-gray-50 border-gray-200 opacity-60" : "bg-red-50 border-red-200"}`}
                >
                  <span className="text-xl">
                    {sos.is_resolved ? "✅" : "🚨"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">
                      {sos.guard_name}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {sos.message}
                    </p>
                    <p
                      className="text-xs text-gray-400 mt-1"
                      suppressHydrationWarning
                    >
                      {formatDateTime(sos.created_at)}
                    </p>
                  </div>
                  {!sos.is_resolved && (
                    <button
                      onClick={() => resolvesSos(sos.id)}
                      className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 shrink-0"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              ))}
              {sosAlerts.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Tidak ada alert SOS
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/checkpoints"
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-2 shadow-sm"
          >
            <span className="text-xl">📍</span>
            <span className="text-sm font-medium text-gray-700">
              Checkpoint
            </span>
          </Link>
          <Link
            href="/dashboard/guards"
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-2 shadow-sm"
          >
            <span className="text-xl">👮</span>
            <span className="text-sm font-medium text-gray-700">Satpam</span>
          </Link>
        </div>
      </main>

      {/* Modal Ganti PIN */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              🔑 Ganti PIN
            </h3>
            <div className="space-y-3">
              {[
                { label: "PIN Lama", key: "oldPin" },
                { label: "PIN Baru (6 digit)", key: "newPin" },
                { label: "Konfirmasi PIN Baru", key: "confirmPin" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600 mb-1">
                    {label}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    value={pinForm[key as keyof typeof pinForm]}
                    onChange={(e) =>
                      setPinForm({
                        ...pinForm,
                        [key]: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 tracking-widest"
                    placeholder="······"
                  />
                </div>
              ))}
              {pinMsg && (
                <p
                  className={`text-sm font-medium ${pinMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}
                >
                  {pinMsg}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
                  setPinMsg("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleChangePin}
                disabled={pinLoading}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50"
              >
                {pinLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
