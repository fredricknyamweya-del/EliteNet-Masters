"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import GradientButton from "../../../components/GradientButton";
import { getRouters, restartRouter } from "../../../lib/api";

export default function RestartHotspotPage() {
  const router = useRouter();
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [restartStatus, setRestartStatus] = useState(null);

  // Load routers from backend on mount
  useEffect(() => {
    async function fetchRouters() {
      try {
        const result = await getRouters();
        if (result.status === "success") {
          setRouters(result.data);
        }
      } catch {
        setRouters([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRouters();
  }, []);

  async function handleRestart() {
    if (!selectedRouter) return;
    setRestarting(true);
    setRestartStatus(null);
    try {
      const result = await restartRouter(selectedRouter.id);
      setRestartStatus(result.status === "success" ? "success" : "error");
    } catch {
      setRestartStatus("error");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-4 pb-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-orbitron text-xl font-bold text-[#22b4af]">
              Restart Hotspot
            </h1>
            <p className="text-[#e4dfed] text-xs mt-0.5">
              Reboot a MikroTik router
            </p>
          </div>
        </div>

        {/* Warning */}
        <GlassCard borderColor="purple" className="p-4">
          <p className="text-[#F59E0B] text-xs text-center">
            ⚠ Restarting the router will disconnect all active clients
            temporarily. Use only when necessary.
          </p>
        </GlassCard>

        {/* Router list */}
        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-4">
          <h2 className="text-[#e0f2ec] font-semibold text-sm">
            Select Router to Reboot
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <div className="w-4 h-4 border-2 border-[#06B6D4]/30 border-t-[#06B6D4] rounded-full animate-spin" />
              <p className="text-white/50 text-xs">Loading routers...</p>
            </div>
          ) : routers.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-4">
              No routers found. Check backend connection.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {routers.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRouter(r);
                    setRestartStatus(null);
                  }}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                    selectedRouter?.id === r.id
                      ? "border-[#22b4af] bg-[#22b4af]/20"
                      : "border-[#06B6D4]/30 hover:border-[#06B6D4]"
                  }`}
                >
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm">
                      {r.name}
                    </p>
                    <p className="text-white/50 text-xs">{r.ip}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      r.status === "online"
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : "bg-[#EF4444]/20 text-[#EF4444]"
                    }`}
                  >
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <GradientButton
              gradient="purple-green"
              onClick={handleRestart}
              disabled={!selectedRouter || restarting}
            >
              {restarting ? "Rebooting..." : "Reboot Router"}
            </GradientButton>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 md:w-56"
            >
              ← Dashboard
            </button>
          </div>
        </GlassCard>

        {/* Success state */}
        {restartStatus === "success" && (
          <GlassCard borderColor="green" className="p-4 flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981] text-lg">
              ✓
            </div>
            <p className="text-[#10B981] font-semibold text-sm">
              Router rebooted successfully
            </p>
            <p className="text-white/60 text-xs text-center">
              {selectedRouter?.name} is restarting. Clients will reconnect
              automatically in ~30 seconds.
            </p>
          </GlassCard>
        )}

        {/* Error state */}
        {restartStatus === "error" && (
          <GlassCard borderColor="purple" className="p-4 flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EF4444]/20 flex items-center justify-center text-[#EF4444] text-lg">
              ✕
            </div>
            <p className="text-[#EF4444] font-semibold text-sm">
              Router unreachable
            </p>
            <p className="text-white/60 text-xs text-center">
              Could not connect to {selectedRouter?.name}. Check the router is
              powered on and reachable.
            </p>
          </GlassCard>
        )}

      </div>
    </main>
  );
}