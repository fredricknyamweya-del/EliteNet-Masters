// frontend/app/admin/sessions/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import NeonInput from "../../../components/NeonInput";
import GradientButton from "../../../components/GradientButton";
import { getSessionHistory } from "../../../lib/api";

function formatShort(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function SessionsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getSessionHistory(filter);
        if (mounted && res?.status === "success") setSessions(res.data || []);
      } catch (requestError) {
        if (mounted) setError(requestError.message || "Failed to load sessions.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [filter]);

  const filtered = useMemo(() => {
    const q = (query || "").trim();
    if (!q) return sessions;
    return sessions.filter((s) => (s.phone_number || "").includes(q));
  }, [sessions, query]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold font-orbitron text-[#22b4af] sm:text-4xl">Session History</h1>
          <p className="mt-2 text-sm text-white/70 sm:text-base">All past sessions — searchable and filterable</p>
        </header>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setFilter('all')} className={`rounded-full px-3 py-1.5 text-sm transition ${filter === 'all' ? 'bg-[#22b4af]/20 text-[#22b4af]' : 'text-white/70 hover:bg-white/5'}`}>All</button>
              <button onClick={() => setFilter('active')} className={`rounded-full px-3 py-1.5 text-sm transition ${filter === 'active' ? 'bg-[#10B981]/20 text-[#10B981]' : 'text-white/70 hover:bg-white/5'}`}>Active</button>
              <button onClick={() => setFilter('expired')} className={`rounded-full px-3 py-1.5 text-sm transition ${filter === 'expired' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'text-white/70 hover:bg-white/5'}`}>Expired</button>
            </div>

            <div className="flex w-full items-center gap-3 md:w-auto">
              <div className="flex-1 md:w-64">
                <NeonInput value={query} onChange={(value) => setQuery(value)} placeholder="Search phone number" />
              </div>
              <div className="w-24">
                <GradientButton gradient="purple-green" onClick={() => setQuery('')}>
                  Clear
                </GradientButton>
              </div>
            </div>
          </div>

          <GlassCard borderColor="#10B981" className="p-5 sm:p-6">
            {error && <p className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-orbitron text-[#22b4af]">Sessions</h3>
              <p className="text-sm text-white/60">{loading ? 'Loading...' : `${filtered.length} sessions`}</p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-white/60">
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Package</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2 pr-4">Expires</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-t border-white/6">
                      <td className="py-3 pr-4 text-white">{s.phone_number}</td>
                      <td className="py-3 pr-4 text-white/70">{s.package}</td>
                      <td className="py-3 pr-4 text-white/60">{formatShort(s.started_at)}</td>
                      <td className="py-3 pr-4 text-white/60">{formatShort(s.expires_at)}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.is_active ? 'bg-[#06B6D4]/20 text-[#06B6D4]' : 'bg-white/5 text-white/60'}`}>{s.is_active ? 'Active' : 'Expired'}</span>
                      </td>
                      <td className="py-3 pr-4 text-white/60">{s.ip_address}</td>
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-4 text-white/60">No sessions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 md:w-56"
          >
            ← Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}