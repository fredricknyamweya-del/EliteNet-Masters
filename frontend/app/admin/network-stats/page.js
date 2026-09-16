// frontend/app/admin/network-stats/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import GradientButton from "../../../components/GradientButton";
import NeonInput from "../../../components/NeonInput";
import { getNetworkStats } from "../../../lib/api";

export default function NetworkStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await getNetworkStats();
        if (mounted && res?.status === "success") setStats(res.data);
      } catch (requestError) {
        if (mounted) setError(requestError.message || "Failed to load network stats.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  const hourly = stats?.hourly_usage || Array.from({ length: 24 }, () => 0);
  const maxVal = Math.max(...hourly, 1);
  const chartHeight = 120;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto max-w-4xl p-6 sm:p-8 lg:p-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold font-orbitron text-[#22b4af] sm:text-4xl">Network Stats</h1>
          <p className="mt-2 text-sm text-white/70 sm:text-base">Bandwidth and usage summary</p>
        </header>

        <div className="space-y-6">
          {error && <p className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <GlassCard borderColor="#22b4af" className="p-5">
              <p className="text-xs font-poppins uppercase tracking-[0.2em] text-white/70">Total data served today</p>
              <h2 className="mt-3 text-3xl font-orbitron text-[#22b4af]">{loading ? '—' : `${stats.total_data_mb} MB`}</h2>
            </GlassCard>

            <GlassCard borderColor="#22b4af" className="p-5">
              <p className="text-xs font-poppins uppercase tracking-[0.2em] text-white/70">Peak hour</p>
              <h2 className="mt-3 text-2xl font-orbitron text-[#22b4af]">{loading ? '—' : stats.peak_hour}</h2>
              <p className="mt-2 text-xs text-white/60">{loading ? '' : `Busiest package: ${stats.busiest_package}`}</p>
            </GlassCard>

            <GlassCard borderColor="#22b4af" className="p-5">
              <p className="text-xs font-poppins uppercase tracking-[0.2em] text-white/70">Active connections</p>
              <h2 className="mt-3 text-3xl font-orbitron text-[#22b4af]">{loading ? '—' : stats.active_connections}</h2>
              <p className="mt-2 text-xs text-white/60">{loading ? '' : `${stats.total_sessions_today} sessions today`}</p>
            </GlassCard>
          </div>

          <GlassCard borderColor="#22b4af" className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-orbitron text-[#22b4af]">Hourly usage</h3>
              <p className="text-xs text-white/60">24 hours</p>
            </div>

            <div className="mt-4">
              <svg className="w-full" viewBox={`0 0 600 ${chartHeight}`} preserveAspectRatio="none">
                <rect x="0" y={chartHeight - 1} width="600" height="1" fill="rgba(255,255,255,0.06)" />
                {hourly.map((val, i) => {
                  const barWidth = 600 / 24;
                  const barHeight = Math.round((val / maxVal) * (chartHeight - 24));
                  const x = i * barWidth + 6;
                  const y = chartHeight - barHeight - 16;
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barWidth - 8} height={barHeight} rx="3" fill={i === (new Date().getHours()) ? "#06B6D4" : "#2563EB"} opacity="0.95" />
                      <text x={x + (barWidth - 8) / 2} y={chartHeight - 4} fontSize="9" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif" opacity="0.6">{i}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </GlassCard>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <GradientButton onClick={() => {}} label="Export CSV" />
            </div>
            <div className="flex-1">
              <GradientButton onClick={() => router.push('/admin/reports')} label="Open Reports" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 md:w-56"
          >
            ← Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}