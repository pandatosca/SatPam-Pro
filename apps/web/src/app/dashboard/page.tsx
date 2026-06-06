"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
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
  const user = localStorage.getItem("patrol_user");
  return user ? JSON.parse(user) : null;
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
          const data = await logsRes.json();
          setLogs(data.logs || []);
        }
        if (sosRes.ok) {
          const data = await sosRes.json();
          setSosAlerts(data.alerts || []);
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser || activeUser.role !== "admin") {
      router.push("/");
      return;
    }
    setUser(activeUser);
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
        setPinMsg("PIN berhasil diganti");
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
    const match = isoStr.match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "--:--";
  };

  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return "--";
    const match = isoStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return "--";
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
    return `${match[3]} ${months[parseInt(match[2])]} ${match[4]}:${match[5]}`;
  };

  const pendingSos = sosAlerts.filter((sos) => !sos.is_resolved);
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
      sub: "Titik patroli",
      icon: MapPin,
      color: "text-violet-700",
      iconBg: "bg-violet-100",
      border: "border-violet-100",
    },
    {
      label: "SOS Alert",
      value: stats?.sos || 0,
      sub: "Belum selesai",
      icon: Siren,
      color: (stats?.sos || 0) > 0 ? "text-red-600" : "text-slate-500",
      iconBg: (stats?.sos || 0) > 0 ? "bg-red-100" : "bg-slate-100",
      border: (stats?.sos || 0) > 0 ? "border-red-100" : "border-slate-100",
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-green-700 bg-green-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">SatPam Pro</h1>
              <p className="text-sm text-green-100/80">Dashboard Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {pendingSos.length > 0 && (
              <button
                onClick={() => setActiveTab("sos")}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-500 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
              >
                <Siren className="h-4 w-4" />
                {pendingSos.length}
              </button>
            )}
            <Link
              href="/dashboard/checkpoints"
              className="hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-green-50/90 hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <MapPin className="h-4 w-4" />
              Checkpoint
            </Link>
            <Link
              href="/dashboard/guards"
              className="hidden min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-green-50/90 hover:bg-white/10 hover:text-white md:inline-flex"
            >
              <UsersRound className="h-4 w-4" />
              Satpam
            </Link>
            <button
              onClick={() => setShowPinModal(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/15"
            >
              <KeyRound className="h-4 w-4" />
              PIN
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">
                {user?.name || "Administrator"}
              </p>
              <button
                onClick={logout}
                className="inline-flex min-h-0 items-center gap-1 text-xs text-green-100/75 hover:text-white"
              >
                <LogOut className="h-3 w-3" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-medium text-green-700">Ringkasan</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Laporan Patroli
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau check-in, aktivitas satpam, dan laporan SOS harian.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="relative block flex-1 sm:w-48">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <button
              onClick={() => fetchAll(selectedDate)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-green-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-2xl border ${card.border} bg-white p-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{card.sub}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/70 p-1.5">
            {(["overview", "logs", "sos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-white text-green-800 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "overview" && (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    Aktivitas
                  </>
                )}
                {tab === "logs" && (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    Log ({logs.length})
                  </>
                )}
                {tab === "sos" && (
                  <>
                    <Siren className="h-4 w-4" />
                    SOS ({pendingSos.length})
                  </>
                )}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="p-4 sm:p-5">
              <div className="grid gap-3">
                {(stats?.guardActivity || []).map((guard) => (
                  <div
                    key={guard.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-bold text-green-800">
                      {guard.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {guard.name}
                      </p>
                      <p
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400"
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
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        guard.checkin_count > 0
                          ? "bg-green-400"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>
                ))}
                {(!stats?.guardActivity ||
                  stats.guardActivity.length === 0) && (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <BarChart3 className="mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-medium text-slate-500">
                      Belum ada aktivitas
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Data patroli untuk tanggal ini akan muncul di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {["Waktu", "Satpam", "Checkpoint", "Status"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td
                        className="whitespace-nowrap px-4 py-3 text-xs text-slate-500"
                        suppressHydrationWarning
                      >
                        {formatDateTime(log.checked_at)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {log.guard_name}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-slate-800">
                          {log.checkpoint_name}
                        </span>
                        <span className="ml-1 text-slate-400">
                          ({log.checkpoint_code})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            log.is_valid
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.is_valid ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {log.is_valid ? "Valid" : "Invalid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-14 text-center text-sm text-slate-400"
                      >
                        Tidak ada log untuk tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "sos" && (
            <div className="space-y-3 p-4 sm:p-5">
              {sosAlerts.map((sos) => (
                <div
                  key={sos.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    sos.is_resolved
                      ? "border-slate-200 bg-slate-50 opacity-70"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div
                    className={`rounded-xl p-2 ${
                      sos.is_resolved
                        ? "bg-slate-100 text-slate-500"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {sos.is_resolved ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Siren className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {sos.guard_name}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {sos.message}
                    </p>
                    <p
                      className="mt-1 text-xs text-slate-400"
                      suppressHydrationWarning
                    >
                      {formatDateTime(sos.created_at)}
                    </p>
                  </div>
                  {!sos.is_resolved && (
                    <button
                      onClick={() => resolvesSos(sos.id)}
                      className="shrink-0 rounded-lg bg-green-700 px-3 text-xs font-semibold text-white hover:bg-green-800"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              ))}
              {sosAlerts.length === 0 && (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                  <Siren className="mb-3 h-8 w-8 text-slate-300" />
                  <p className="font-medium text-slate-500">
                    Tidak ada alert SOS
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Semua laporan darurat akan tampil di panel ini.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3 md:hidden">
          <Link
            href="/dashboard/checkpoints"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <MapPin className="h-5 w-5 text-green-700" />
            <span className="text-sm font-medium text-slate-700">
              Checkpoint
            </span>
          </Link>
          <Link
            href="/dashboard/guards"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <UsersRound className="h-5 w-5 text-blue-700" />
            <span className="text-sm font-medium text-slate-700">Satpam</span>
          </Link>
        </div>
      </main>

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
              <KeyRound className="h-5 w-5 text-green-700" />
              Ganti PIN
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
                    placeholder="......"
                  />
                </div>
              ))}
              {pinMsg && (
                <p
                  className={`text-sm font-medium ${
                    pinMsg.includes("berhasil")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
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
