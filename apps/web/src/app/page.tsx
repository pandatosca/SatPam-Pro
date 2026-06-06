'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('patrol_token');
    const user = localStorage.getItem('patrol_user');
    if (token && user) {
      const u = JSON.parse(user);
      if (u.role === 'admin') router.push('/dashboard');
      else router.push('/patrol');
    }
    // Run password setup once for seeded users
    if (!localStorage.getItem('patrol_setup_done')) {
      fetch('/api/patrol/setup', { method: 'POST' })
        .then(() => {
          localStorage.setItem('patrol_setup_done', '1');
        })
        .catch(() => {});
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/patrol/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login gagal');
        return;
      }
      localStorage.setItem('patrol_token', data.token);
      localStorage.setItem('patrol_user', JSON.stringify(data.user));
      if (data.user.role === 'admin') router.push('/dashboard');
      else router.push('/patrol');
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">SatPam Pro</h1>
          <p className="text-blue-200 mt-1">Sistem Patroli Perumahan</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Masuk ke Sistem</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
            <p className="font-medium mb-2 text-gray-600">Akun Default (password: password123):</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <p>👔 admin (Admin)</p>
              <p>👮 budi</p>
              <p>👮 suharto</p>
              <p>👮 agus</p>
              <p>👮 dedi</p>
              <p>👮 roni</p>
              <p>👮 eko</p>
            </div>
          </div>
        </div>
        <p className="text-center text-blue-200 text-xs mt-6">
          SatPam Pro v1.0 — Perumahan Security Patrol System
        </p>
      </div>
    </div>
  );
}
