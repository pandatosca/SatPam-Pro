"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Siren,
  UsersRound,
} from "lucide-react";

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
  is_valid: boolean;
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
        setPinMsg("✅ PIN berhasil diganti");
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

  const statCards = [
    {
      label: "Check-in",
      value: stats?.today.total || 0,
      sub: `${stats?.today.valid || 0} valid`,
      icon: CheckCircle2,
      color: "text-emerald-700",
      iconBg: "bg-emerald-100",
      border: "border-emerald-100",
    },
    {
      label: "Satpam",
      value: stats?.guards || 0,
      sub: "Aktif",
      icon: UsersRound,
      color: "text-blue-700",
      iconBg: "bg-blue-100",
      border: "border-blue-100",
    },
    {
      label: "Checkpoint",
      value: stats?.checkpoints || 0,
      sub: "Titik",
      icon: MapPin,
      color: "text-violet-700",
      iconBg: "bg-violet-100",
      border: "border-violet-100",
    },
    {
      label: "SOS",
      value: stats?.sos || 0,
      sub: "Belum selesai",
      icon: Siren,
      color: (stats?.sos || 0) > 0 ? "text-red-600" : "text-slate-400",
      iconBg: (stats?.sos || 0) > 0 ? "bg-red-100" : "bg-slate-100",
      border: (stats?.sos || 0) > 0 ? "border-red-200" : "border-slate-100",
    },
  ];

  if (loading && !selectedDate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-green-700" />
          <p className="text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-green-700 bg-green-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-5 w-5 text-emerald-100" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">SatPam Pro</p>
              <p className="text-xs text-green-300">Dashboard Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {pendingSos.length > 0 && (
              <button
                onClick={() => setActiveTab("sos")}
                className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-bold text-white animate-pulse"
              >
                <Siren className="h-3.5 w-3.5" /> {pendingSos.length}
              </button>
            )}
            <Link
              href="/dashboard/checkpoints"
              className="hidden md:inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-200 hover:bg-white/10"
            >
              <MapPin className="h-3.5 w-3.5" /> Checkpoint
            </Link>
            <Link
              href="/dashboard/guards"
              className="hidden md:inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-200 hover:bg-white/10"
            >
              <UsersRound className="h-3.5 w-3.5" /> Satpam
            </Link>
            <button
              onClick={() => setShowPinModal(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            >
              <KeyRound className="h-3.5 w-3.5" /> PIN
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-green-300 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-3 py-3 pb-20 sm:px-4 sm:py-4 sm:pb-4">
        {/* Date filter — compact */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
          <button
            onClick={() => fetchAll(selectedDate)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Stats 2x2 grid di mobile */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-2xl border ${card.border} bg-white p-3 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {card.label}
                    </p>
                    <p className={`mt-1.5 text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    <p className="text-xs text-slate-400">{card.sub}</p>
                  </div>
                  <div className={`rounded-lg p-2 ${card.iconBg}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          {/* Tab bar */}
          <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/70 p-1">
            {(["overview", "logs", "sos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-white text-green-800 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "overview" && (
                  <>
                    <BarChart3 className="h-3.5 w-3.5" /> Aktivitas
                  </>
                )}
                {tab === "logs" && (
                  <>
                    <ClipboardList className="h-3.5 w-3.5" /> Log ({logs.length}
                    )
                  </>
                )}
                {tab === "sos" && (
                  <>
                    <Siren className="h-3.5 w-3.5" /> SOS ({pendingSos.length})
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "overview" && (
              <div className="p-3 space-y-2">
                {(stats?.guardActivity || []).map((guard) => (
                  <div
                    key={guard.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-800">
                      {guard.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {guard.name}
                      </p>
                      <p
                        className="inline-flex items-center gap-1 text-xs text-slate-400"
                        suppressHydrationWarning
                      >
                        <Activity className="h-3 w-3" />
                        {guard.last_checkin
                          ? formatTime(guard.last_checkin)
                          : "Belum patroli"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-green-700">
                        {guard.checkin_count}
                      </p>
                      <p className="text-xs text-slate-400">
                        {guard.valid_count} valid
                      </p>
                    </div>
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${guard.checkin_count > 0 ? "bg-green-400" : "bg-slate-300"}`}
                    />
                  </div>
                ))}
                {(!stats?.guardActivity ||
                  stats.guardActivity.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      Belum ada aktivitas
                    </p>
                    <p className="text-xs text-slate-400">
                      Data patroli akan muncul di sini.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "logs" && (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${log.is_valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {log.is_valid ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {log.is_valid ? "Valid" : "Invalid"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {log.guard_name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {log.checkpoint_name} · {log.checkpoint_code}
                      </p>
                    </div>
                    <p
                      className="text-xs text-slate-400 shrink-0 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {formatDateTime(log.checked_at)}
                    </p>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      Tidak ada log
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "sos" && (
              <div className="p-3 space-y-2">
                {sosAlerts.map((sos) => (
                  <div
                    key={sos.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${sos.is_resolved ? "border-slate-200 bg-slate-50 opacity-70" : "border-red-200 bg-red-50"}`}
                  >
                    <div
                      className={`rounded-lg p-1.5 shrink-0 ${sos.is_resolved ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-600"}`}
                    >
                      {sos.is_resolved ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Siren className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {sos.guard_name}
                      </p>
                      <p className="text-xs text-slate-600">{sos.message}</p>
                      <p
                        className="text-xs text-slate-400"
                        suppressHydrationWarning
                      >
                        {formatDateTime(sos.created_at)}
                      </p>
                    </div>
                    {!sos.is_resolved && (
                      <button
                        onClick={() => resolvesSos(sos.id)}
                        className="shrink-0 rounded-lg bg-green-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                      >
                        Selesai
                      </button>
                    )}
                  </div>
                ))}
                {sosAlerts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Siren className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      Tidak ada alert SOS
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${activeTab === "overview" ? "text-green-700" : "text-slate-500"}`}
          >
            <BarChart3 className="h-5 w-5" /> Aktivitas
          </button>
          <Link
            href="/dashboard/checkpoints"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-500"
          >
            <MapPin className="h-5 w-5" /> Checkpoint
          </Link>
          <Link
            href="/dashboard/guards"
            className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-slate-500"
          >
            <UsersRound className="h-5 w-5" /> Satpam
          </Link>
        </div>
      </nav>

      {/* Modal PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <KeyRound className="h-5 w-5 text-green-700" /> Ganti PIN
            </h3>
            <div className="space-y-3">
              {[
                { label: "PIN Lama", key: "oldPin" },
                { label: "PIN Baru (6 digit)", key: "newPin" },
                { label: "Konfirmasi PIN Baru", key: "confirmPin" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm text-slate-600">
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="······"
                  />
                </div>
              ))}
              {pinMsg && (
                <p
                  className={`text-sm font-medium ${pinMsg.includes("✅") ? "text-green-600" : "text-red-600"}`}
                >
                  {pinMsg}
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinForm({ oldPin: "", newPin: "", confirmPin: "" });
                  setPinMsg("");
                }}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleChangePin}
                disabled={pinLoading}
                className="flex-1 rounded-lg bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
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
