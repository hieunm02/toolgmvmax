"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const from = searchParams.get("from") || "/";
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || "Tài khoản hoặc mật khẩu không chính xác!");
      }
    } catch (err: any) {
      setError("Đã xảy ra lỗi kết nối. Vui lòng thử lại!");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-350 text-xs font-mono flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Username Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider block">
          Tài khoản
        </label>
        <div className="flex items-center bg-[#15181F] border border-[#2B303C] hover:border-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all px-3.5 py-2.5">
          <span className="text-gray-500 mr-2.5 text-sm select-none">👤</span>
          <input
            type="text"
            placeholder="Nhập tên đăng nhập..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-transparent text-white text-xs font-mono outline-none placeholder-gray-600"
            disabled={loading}
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold tracking-wider block">
          Mật khẩu
        </label>
        <div className="flex items-center bg-[#15181F] border border-[#2B303C] hover:border-indigo-500/50 focus-within:border-indigo-500 rounded-lg transition-all px-3.5 py-2.5">
          <span className="text-gray-500 mr-2.5 text-sm select-none">🔑</span>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent text-white text-xs font-mono outline-none placeholder-gray-600"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-500 hover:text-gray-300 text-xs font-mono ml-2 focus:outline-none transition-colors"
            disabled={loading}
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-indigo-600/10 active:scale-[0.98] border border-indigo-500/50 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Đang đăng nhập...</span>
          </>
        ) : (
          <span>Xác nhận đăng nhập</span>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08090C] px-4 py-12 relative overflow-hidden font-sans">
      {/* Sleek radial backgrounds for glow effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        {/* Logo/Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-xl shadow-indigo-500/10 mb-4 animate-pulse">
            <div className="w-full h-full bg-[#0E1015] rounded-[14px] flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
            GMV MAX MH
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-2 tracking-widest uppercase">
            TikTok Ads Centralized Control Room
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111318]/95 border border-[#1F232B] rounded-2xl p-8 shadow-2xl shadow-black/50 backdrop-blur-xl relative group transition-all duration-300 hover:border-indigo-500/30">
          {/* Subtle top border glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

          <h2 className="text-lg font-bold text-white mb-6 font-mono tracking-wider uppercase text-center sm:text-left">
            ĐĂNG NHẬP HỆ THỐNG
          </h2>

          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-gray-400 font-mono">Đang tải biểu mẫu...</span>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
        
        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-500 font-mono">
            &copy; 2026 GMV Max OS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
