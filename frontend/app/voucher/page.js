"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CyberpunkBackground from "../../components/CyberpunkBackground";
import GlassCard from "../../components/GlassCard";
import GradientButton from "../../components/GradientButton";
import NeonInput from "../../components/NeonInput";
import { activateVoucher } from "../../lib/api";

export default function VoucherPage() {
  const router = useRouter();
  const [voucherCode, setVoucherCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleActivate() {
    if (!voucherCode.trim()) {
      setError("Enter voucher code");
      setStatus(null);
      return;
    }

    setError("");
    setLoading(true);
    setStatus(null);

    try {
      const result = await activateVoucher(voucherCode.trim().toUpperCase());
      setLoading(false);

      if (result.status !== "success") {
        setStatus("error");
        setError(result.message || "Invalid or already used voucher code.");
        return;
      }

      setStatus("success");
      setStatusMessage(result.message || "Access granted! You are now connected.");
      setVoucherCode("");
    } catch (requestError) {
      setLoading(false);
      setStatus("error");
      setError(requestError.message || "Failed to activate voucher.");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[#22b4af]">Voucher Activation</h1>
          <p className="mt-1 text-sm text-white/70">Enter your voucher code to activate internet access.</p>
        </div>

        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-3">
          <NeonInput
            placeholder="Enter voucher code"
            value={voucherCode}
            onChange={(value) => {
              setVoucherCode(value.toUpperCase());
              if (error) setError("");
            }}
            borderColor="cyan"
          />
          {error && (
            <p className="text-xs text-[#EF4444]" role="alert">
              {error}
            </p>
          )}

          <GradientButton gradient="cyan-green" onClick={handleActivate} disabled={loading}>
            {loading ? "Activating..." : "Activate Voucher"}
          </GradientButton>
        </GlassCard>

        {status === "success" && (
          <GlassCard borderColor="green" className="p-5 text-center">
            <p className="font-semibold text-[#10B981]">Voucher activated</p>
            <p className="mt-1 text-xs text-white/80">{statusMessage || "Your session is now active. You can begin browsing."}</p>
          </GlassCard>
        )}

        <button
          type="button"
          onClick={() => router.push("/packages")}
          className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        >
          Back to Packages
        </button>
      </div>
    </main>
  );
}