'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
interface Log {
  id: number;
  checkpoint_name: string;
  checkpoint_code: string;
  checked_at: string;
  is_valid: boolean;
  distance_meters: number;
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('patrol_token') || '' : '';
}
function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('patrol_user');
  return u ? JSON.parse(u) : null;
}

// Pure string parsing - no new Date() in render
function fmtTime(isoStr: string) {
  if (!isoStr) return '--:--';
  const m = isoStr.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '--:--';
}

export default function PatrolPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; id: number } | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [todayLogs, setTodayLogs] = useState<Log[]>([]);
  const [scanning, setScanning] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    valid?: boolean;
    distance?: number | null;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [today, setToday] = useState('');
  const [origin, setOrigin] = useState('');
  const [todayLabel, setTodayLabel] = useState('');

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setToday(`${y}-${mo}-${dy}`);
    setOrigin(window.location.origin);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
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
    setTodayLabel(`${days[d.getDay()]}, ${dy} ${months[d.getMonth()]} ${y}`);
  }, []);

  const fetchData = useCallback(
    async (todayDate: string, userId: number) => {
      if (!todayDate) return;
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }
      try {
        const [cpRes, logRes] = await Promise.all([
          fetch('/api/patrol/checkpoints', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/patrol/logs?date=${todayDate}&user_id=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (cpRes.ok) {
          const d = await cpRes.json();
          setCheckpoints(d.checkpoints || []);
        }
        if (logRes.ok) {
          const d = await logRes.json();
          setTodayLogs(d.logs || []);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [router]
  );

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push('/');
      return;
    }
    if (u.role === 'admin') {
      router.push('/dashboard');
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!today || !user) return;
    fetchData(today, user.id);
  }, [today, user, fetchData]);

  const getGPS = () => {
    setGpsError('');
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('Tidak bisa mendapatkan GPS: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCheckIn = async () => {
    if (!checkInCode.trim()) {
      setResult({ ok: false, message: 'Masukkan kode checkpoint' });
      return;
    }
    const token = getToken();
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/patrol/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          checkpoint_code: checkInCode.trim().toUpperCase(),
          gps_lat: gpsPos?.lat,
          gps_lng: gpsPos?.lng,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || 'Check-in gagal' });
        setScanning(false);
        return;
      }
      setResult({
        ok: true,
        message: `Check-in berhasil di ${data.checkpoint.name}!`,
        valid: data.is_valid,
        distance: data.distance,
      });
      setCheckInCode('');
      setNotes('');
      if (user) fetchData(today, user.id);
    } catch {
      setResult({ ok: false, message: 'Terjadi kesalahan' });
    }
    setScanning(false);
  };

  const handleSOS = async () => {
    setSosLoading(true);
    const token = getToken();
    try {
      await fetch('/api/patrol/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lat: gpsPos?.lat,
          lng: gpsPos?.lng,
          message: 'DARURAT! Butuh bantuan segera.',
        }),
      });
      setSosSuccess(true);
      setTimeout(() => setSosSuccess(false), 5000);
    } catch {
      alert('Gagal kirim SOS');
    }
    setSosLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('patrol_token');
    localStorage.removeItem('patrol_user');
    router.push('/');
  };

  const qrUrl = (code: string) => {
    if (!origin) return '';
    const url = `${origin}/checkin/${code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👮</span>
            <div>
              <h1 className="text-lg font-bold">Patroli Saya</h1>
              <p className="text-blue-300 text-xs">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-200 text-xs hidden sm:block">{todayLabel}</span>
            <button onClick={logout} className="text-blue-300 hover:text-white text-xs ml-2">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {sosSuccess && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-xl text-sm font-medium">
            ✅ SOS telah dikirim ke admin! Bantuan sedang dalam perjalanan.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{todayLogs.length}</p>
            <p className="text-xs text-gray-500">Check-in Hari Ini</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">
              {todayLogs.filter((l) => l.is_valid).length}
            </p>
            <p className="text-xs text-gray-500">Valid GPS</p>
          </div>
        </div>

        {/* GPS */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">📡 Status GPS</h3>
            <button
              onClick={getGPS}
              disabled={gpsLoading}
              className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {gpsLoading ? 'Mendeteksi...' : gpsPos ? 'Update GPS' : 'Aktifkan GPS'}
            </button>
          </div>
          {gpsPos ? (
            <div className="bg-green-50 rounded-lg p-3 text-sm">
              <p className="text-green-700 font-medium">✅ GPS Aktif</p>
              <p className="text-green-600 text-xs mt-1">
                📍 {gpsPos.lat.toFixed(6)}, {gpsPos.lng.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-3 text-sm">
              <p className="text-yellow-700">⚠️ GPS belum aktif — aktifkan untuk validasi lokasi</p>
              {gpsError && <p className="text-red-600 text-xs mt-1">{gpsError}</p>}
            </div>
          )}
        </div>

        {/* Check-in Form */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">📲 Check-in Checkpoint</h3>
          {result && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}
            >
              <p className="font-medium">
                {result.ok ? '✅' : '⚠️'} {result.message}
              </p>
              {result.ok && result.distance !== null && result.distance !== undefined && (
                <p className="text-xs mt-1">
                  Jarak dari titik: {result.distance}m —{' '}
                  {result.valid ? '✅ Dalam area valid' : '⚠️ Di luar radius area'}
                </p>
              )}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">
                Kode Checkpoint (scan QR atau ketik)
              </label>
              <input
                type="text"
                value={checkInCode}
                onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                placeholder="Contoh: CP001"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 font-mono text-xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 font-medium block mb-1">
                Catatan (opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Situasi aman / ada temuan..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              onClick={handleCheckIn}
              disabled={scanning || !checkInCode.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              {scanning ? 'Memproses...' : '✅ Check-in Sekarang'}
            </button>
          </div>
        </div>

        {/* Checkpoints list with QR */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">📍 Rute Patroli</h3>
          <div className="space-y-3">
            {checkpoints
              .filter((c) => c.is_active)
              .map((cp) => {
                const visited = todayLogs.find((l) => l.checkpoint_code === cp.checkpoint_code);
                return (
                  <div
                    key={cp.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${visited ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {origin ? (
                      <img
                        src={qrUrl(cp.checkpoint_code)}
                        alt={cp.checkpoint_code}
                        className="w-16 h-16 rounded-lg shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{cp.name}</p>
                      <p className="text-xs text-gray-500">{cp.description}</p>
                      <p className="text-xs font-mono font-bold text-blue-700 mt-1 bg-blue-50 px-2 py-0.5 rounded w-fit">
                        {cp.checkpoint_code}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {visited ? (
                        <>
                          <p className="text-green-600 text-xl">✅</p>
                          <p className="text-xs text-green-600">{fmtTime(visited.checked_at)}</p>
                        </>
                      ) : (
                        <p className="text-gray-300 text-2xl">⬜</p>
                      )}
                    </div>
                  </div>
                );
              })}
            {checkpoints.length === 0 && (
              <p className="text-center text-gray-400 py-4">
                Belum ada titik patroli dikonfigurasi
              </p>
            )}
          </div>
        </div>

        {/* Log hari ini */}
        {todayLogs.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">📋 Log Hari Ini</h3>
            <div className="space-y-2">
              {todayLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="font-medium text-gray-700">{log.checkpoint_name}</span>
                    <span className="text-gray-400 text-xs ml-2">({log.checkpoint_code})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${log.is_valid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                    >
                      {log.is_valid ? '✅ Valid' : '⚠️ GPS jauh'}
                    </span>
                    <span className="text-gray-500 text-xs">{fmtTime(log.checked_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOS */}
        <button
          onClick={handleSOS}
          disabled={sosLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-5 rounded-xl text-lg shadow-lg transition-colors"
        >
          {sosLoading ? 'Mengirim SOS...' : '🚨 TOMBOL DARURAT / SOS'}
        </button>
        <p className="text-center text-xs text-gray-400 pb-6">
          Tekan hanya dalam keadaan darurat — admin akan diberitahu segera
        </p>
      </div>
    </div>
  );
}
