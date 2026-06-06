"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("patrol_token");
    const userStr = localStorage.getItem("patrol_user");
    if (token && userStr) {
      const u = JSON.parse(userStr);
      router.push(u.role === "admin" ? "/dashboard" : "/patrol");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/patrol/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login gagal");
        return;
      }

      localStorage.setItem("patrol_token", data.token);
      localStorage.setItem("patrol_user", JSON.stringify(data.user));
      router.push(data.user.role === "admin" ? "/dashboard" : "/patrol");
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleNumpadClick = (digit: string) => {
    if (pin.length < 6) setPin(pin + digit);
  };

  const handleNumpadDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-4">
            <span className="text-5xl">🛡️</span>
          </div>
          <h1 className="text-4xl font-bold text-white">SatPam Pro</h1>
          <p className="text-green-200 mt-2 text-lg">
            Sistem Patroli Perumahan
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Masuk ke Sistem
          </h2>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-4 rounded-lg mb-4 text-base font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Masukkan username"
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                PIN (6 Digit)
              </label>
              <div className="flex gap-2 justify-center mb-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                      pin.length > i
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-gray-100 border-gray-300 text-gray-400"
                    }`}
                  >
                    {pin.length > i ? "●" : ""}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumpadClick(digit)}
                    className="bg-gray-100 hover:bg-gray-200 active:bg-green-100 text-2xl font-bold py-4 rounded-lg transition-colors"
                  >
                    {digit}
                  </button>
                ))}
                <div></div>
                <button
                  type="button"
                  onClick={() => handleNumpadClick("0")}
                  className="bg-gray-100 hover:bg-gray-200 active:bg-green-100 text-2xl font-bold py-4 rounded-lg transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleNumpadDelete}
                  className="bg-red-100 hover:bg-red-200 active:bg-red-300 text-2xl font-bold py-4 rounded-lg transition-colors"
                >
                  ⌫
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xl font-semibold py-5 rounded-lg transition-colors mt-4"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-base text-gray-600">
            <p className="font-semibold mb-2 text-gray-700">💡 Info Login:</p>
            <p className="text-sm mb-1">
              • PIN default awal:{" "}
              <code className="bg-white px-2 py-1 rounded font-mono border">
                123456
              </code>
            </p>
            <p className="text-sm">
              • Hubungi admin jika lupa PIN atau akun terkunci.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
