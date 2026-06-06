'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  return typeof window !== 'undefined' ? localStorage.getItem('patrol_token') || '' : '';
}
function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('patrol_user');
  return u ? JSON.parse(u) : null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'sos'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  const fetchAll = useCallback(
    async (date: string) => {
      if (!date) return;
      const token = getToken();
      if (!token) {
        router.push('/');
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
          fetch('/api/patrol/sos', { headers: { Authorization: `Bearer ${token}` } }),
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
    [router]
  );

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') {
      router.push('/');
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
    await fetch('/api/patrol/sos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (selectedDate) fetchAll(selectedDate);
  };

  const logout = () => {
    localStorage.removeItem('patrol_token');
    localStorage.removeItem('patrol_user');
    router.push('/');
  };

  // Use pure string parsing to avoid new Date() in render path
  const formatTime = (isoStr: string) => {
    if (!isoStr) return '--:--';
    const m = isoStr.match(/T(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : '--:--';
  };
  const formatDateTime = (isoStr: string) => {
    if (!isoStr) return '--';
    const m = isoStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return '--';
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agt',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${m[3]} ${months[parseInt(m[2])]} ${m[4]}:${m[5]}`;
  };

  const pendingSos = sosAlerts.filter((s) => !s.is_resolved);

  if (loading && !selectedDate) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="text-lg font-bold">SatPam Pro</h1>
              <p className="text-blue-300 text-xs">Dashboard Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingSos.length > 0 && (
              <button
                onClick={() => setActiveTab('sos')}
                className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full"
              >
                🚨 SOS ({pendingSos.length})
              </button>
            )}
            <Link
              href="/dashboard/checkpoints"
              className="hidden md:block text-blue-200 hover:text-white text-sm transition-colors"
            >
              📍 Titik Patroli
            </Link>
            <Link
              href="/dashboard/guards"
              className="hidden md:block text-blue-200 hover:text-white text-sm transition-colors"
            >
              👮 Satpam
            </Link>
            <div className="text-right text-sm">
              <p className="font-medium">{user?.name}</p>
              <button onClick={logout} className="text-blue-300 hover:text-white text-xs">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-800">Laporan Patroli</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Tanggal:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => fetchAll(selectedDate)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Check-in Hari Ini
            </p>
            <p className="text-3xl font-bold text-blue-600">{stats?.today.total || 0}</p>
            <p className="text-xs text-green-600 mt-1">Valid: {stats?.today.valid || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Total Satpam
            </p>
            <p className="text-3xl font-bold text-indigo-600">{stats?.guards || 0}</p>
            <p className="text-xs text-gray-400 mt-1">👮 Aktif</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Titik Patroli
            </p>
            <p className="text-3xl font-bold text-purple-600">{stats?.checkpoints || 0}</p>
            <p className="text-xs text-gray-400 mt-1">📍 Checkpoint</p>
          </div>
          <div
            className={`rounded-xl p-5 shadow-sm border ${(stats?.sos || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
          >
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
              Alert SOS
            </p>
            <p
              className={`text-3xl font-bold ${(stats?.sos || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}
            >
              {stats?.sos || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">🚨 Belum selesai</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['overview', 'logs', 'sos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab === 'overview' && '📊 Aktivitas Satpam'}
                {tab === 'logs' && `📋 Log Patroli (${logs.length})`}
                {tab === 'sos' && `🚨 SOS (${pendingSos.length})`}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-4">
              <div className="grid gap-3">
                {(stats?.guardActivity || []).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {g.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm">{g.name}</p>
                      <p className="text-xs text-gray-400" suppressHydrationWarning>
                        Terakhir: {g.last_checkin ? formatTime(g.last_checkin) : 'Belum patroli'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-blue-600">{g.checkin_count}</p>
                      <p className="text-xs text-green-600">{g.valid_count} valid</p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${g.checkin_count > 0 ? 'bg-green-400' : 'bg-gray-300'}`}
                    />
                  </div>
                ))}
                {(!stats?.guardActivity || stats.guardActivity.length === 0) && (
                  <p className="text-center text-gray-400 py-8">Belum ada data untuk tanggal ini</p>
                )}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Waktu</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                      Satpam
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                      Checkpoint
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                      Jarak GPS
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600" suppressHydrationWarning>
                        {formatDateTime(log.checked_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{log.guard_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800">{log.checkpoint_name}</span>
                        <span className="ml-1 text-xs text-gray-400">({log.checkpoint_code})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.distance_meters !== null ? `${log.distance_meters}m` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${log.is_valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {log.is_valid ? '✅ Valid' : '⚠️ Di luar area'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400">
                        Tidak ada log untuk tanggal ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SOS Tab */}
          {activeTab === 'sos' && (
            <div className="p-4 space-y-3">
              {sosAlerts.map((sos) => (
                <div
                  key={sos.id}
                  className={`p-4 rounded-lg border flex items-start gap-4 ${sos.is_resolved ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-red-50 border-red-200'}`}
                >
                  <span className="text-2xl">{sos.is_resolved ? '✅' : '🚨'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{sos.guard_name}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{sos.message}</p>
                    <p className="text-xs text-gray-400 mt-1" suppressHydrationWarning>
                      {formatDateTime(sos.created_at)}
                    </p>
                    {sos.lat && (
                      <p className="text-xs text-blue-600 mt-1">
                        📍 {sos.lat}, {sos.lng}
                      </p>
                    )}
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
                <p className="text-center text-gray-400 py-10">Tidak ada alert SOS</p>
              )}
            </div>
          )}
        </div>

        {/* Mobile nav */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          <Link
            href="/dashboard/checkpoints"
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">📍</span>
            <span className="text-sm font-medium text-gray-700">Kelola Checkpoint</span>
          </Link>
          <Link
            href="/dashboard/guards"
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">👮</span>
            <span className="text-sm font-medium text-gray-700">Kelola Satpam</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
