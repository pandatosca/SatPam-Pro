"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      router.push(user.role === "admin" ? "/dashboard" : "/patrol");
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

  const handleNumpad = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const numpad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen bg-green-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-3xl mb-4 ring-1 ring-white/20">
            <span className="text-4xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white">SatPam Pro</h1>
          <p className="text-green-300 mt-1">Sistem Patroli Perumahan</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          {/* Username */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Masukkan username"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base text-slate-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
              required
              autoComplete="username"
            />
          </div>

          {/* PIN dots */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              PIN (6 Digit)
            </label>
            <div className="flex justify-center gap-2 mb-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                    pin.length > i
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-slate-50 border-slate-200 text-slate-300"
                  }`}
                >
                  {pin.length > i ? "●" : ""}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {numpad.map((key, i) => {
                if (key === "") return <div key={i} />;
                if (key === "⌫")
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={handleDelete}
                      className="h-12 rounded-xl bg-red-50 text-red-500 text-xl font-bold hover:bg-red-100 active:scale-95 transition-all"
                    >
                      ⌫
                    </button>
                  );
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleNumpad(key)}
                    className="h-12 rounded-xl bg-slate-100 hover:bg-green-50 active:bg-green-100 active:scale-95 text-xl font-bold text-slate-800 transition-all"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-medium text-center">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading || pin.length !== 6 || !username}
            className="w-full bg-green-700 hover:bg-green-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base font-bold py-4 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
