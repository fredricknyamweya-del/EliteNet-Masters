"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CyberpunkBackground from "../../components/CyberpunkBackground";
import GlassCard from "../../components/GlassCard";
import GradientButton from "../../components/GradientButton";
import NeonInput from "../../components/NeonInput";
import { reconnect as reconnectSession } from "../../lib/api";

export default function ReconnectPage() {
  const router = useRouter();
  const [mpesaCode, setMpesaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleReconnect() {
    if (!mpesaCode.trim()) {
      setError("Enter M-Pesa code");
      setStatus(null);
      return;
    }

    setError("");
    setLoading(true);
    setStatus(null);

    try {
      const result = await reconnectSession(mpesaCode.trim().toUpperCase());
      if (result.status === "success") {
        setStatus("success");
        setStatusMessage(result.message || "Access restored. You are now reconnected.");
      } else {
        setStatus("error");
        setError(result.message || "M-Pesa code not found or already used.");
      }
    } catch (requestError) {
      setStatus("error");
      setError(requestError.message || "Failed to reconnect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[#22b4af]">Reconnect Session</h1>
          <p className="mt-1 text-sm text-white/70">Use your recent M-Pesa code to restore internet access.</p>
        </div>

        <GlassCard borderColor="purple" className="p-5 flex flex-col gap-3">
          <NeonInput
            placeholder="Enter M-Pesa code e.g. QAH9QWWZRR"
            value={mpesaCode}
            onChange={(value) => {
              setMpesaCode(value.toUpperCase());
              if (error) setError("");
            }}
            borderColor="purple"
          />
          {error && (
            <p className="text-xs text-[#EF4444]" role="alert">
              {error}
            </p>
          )}

          <GradientButton gradient="purple-green" onClick={handleReconnect} disabled={loading}>
            {loading ? "Reconnecting..." : "Reconnect Now"}
          </GradientButton>
        </GlassCard>

        {status === "success" && (
          <GlassCard borderColor="green" className="p-5 text-center">
            <p className="font-semibold text-[#10B981]">Reconnection successful</p>
            <p className="mt-1 text-xs text-white/80">{statusMessage || "Your hotspot session is active again."}</p>
          </GlassCard>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/payment")}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            Need to make a new payment?
          </button>
          <button
            type="button"
            onClick={() => router.push("/packages")}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            Back to Packages
          </button>
        </div>
      </div>
    </main>
  );
}