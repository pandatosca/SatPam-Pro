'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// QR Code deep-link check-in page
// When guard scans QR with phone camera, this page opens
// It prompts GPS verification and records the check-in

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('patrol_token') || '' : '';
}
function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('patrol_user');
  return u ? JSON.parse(u) : null;
}

export default function CheckinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params?.code?.toUpperCase() || '';

  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{
    ok: boolean;
    checkpoint?: string;
    message?: string;
    valid?: boolean;
    distance?: number | null;
  } | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      // Not logged in - redirect to login
      router.push(`/?redirect=/checkin/${code}`);
      return;
    }
    setUser(u);
    // Auto-get GPS
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
        },
        (err) => {
          setGpsError('GPS tidak tersedia: ' + err.message);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }, [code, router]);

  const handleCheckIn = async () => {
    const token = getToken();
    setSubmitting(true);
    try {
      const res = await fetch('/api/patrol/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          checkpoint_code: code,
          gps_lat: gpsPos?.lat,
          gps_lng: gpsPos?.lng,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || 'Check-in gagal' });
      } else {
        setResult({
          ok: true,
          checkpoint: data.checkpoint?.name,
          valid: data.is_valid,
          distance: data.distance,
        });
      }
    } catch {
      setResult({ ok: false, message: 'Terjadi kesalahan, coba lagi' });
    }
    setSubmitting(false);
  };

  if (result?.ok) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800">Check-in Berhasil!</h1>
          <p className="text-gray-600 mt-2">{result.checkpoint}</p>
          <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
            <p className="text-gray-600">
              Satpam: <span className="font-semibold">{user?.name}</span>
            </p>
            {result.distance !== null && result.distance !== undefined && (
              <p
                className={`mt-1 font-medium ${result.valid ? 'text-green-600' : 'text-orange-500'}`}
              >
                {result.valid ? '✅ Dalam area valid' : '⚠️ Di luar radius'} ({result.distance}m)
              </p>
            )}
          </div>
          <Link
            href="/patrol"
            className="mt-6 block bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Kembali ke Patroli
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📍</div>
          <h1 className="text-xl font-bold text-gray-800">Check-in Titik Patroli</h1>
          <div className="mt-2 inline-block bg-blue-100 text-blue-800 font-mono font-bold px-4 py-1.5 rounded-full text-lg">
            {code}
          </div>
        </div>

        {user && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            👮 Satpam: <span className="font-semibold">{user.name}</span>
          </div>
        )}

        {/* GPS Status */}
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${gpsPos ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}
        >
          {gpsLoading ? (
            <p className="text-yellow-700">⏳ Mendeteksi GPS...</p>
          ) : gpsPos ? (
            <>
              <p className="text-green-700 font-medium">✅ GPS Terdeteksi</p>
              <p className="text-green-600 text-xs mt-1">
                📍 {gpsPos.lat.toFixed(5)}, {gpsPos.lng.toFixed(5)}
              </p>
            </>
          ) : (
            <p className="text-yellow-700">⚠️ {gpsError || 'GPS tidak tersedia'}</p>
          )}
        </div>

        {result && !result.ok && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {result.message}
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-gray-600 font-medium block mb-1">Catatan (opsional)</label>
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
          disabled={submitting || gpsLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl text-sm transition-colors"
        >
          {submitting ? 'Memproses...' : '✅ Konfirmasi Check-in'}
        </button>

        <Link
          href="/patrol"
          className="block text-center text-gray-400 text-sm mt-4 hover:text-gray-600"
        >
          Kembali ke halaman patroli
        </Link>
      </div>
    </div>
  );
}
