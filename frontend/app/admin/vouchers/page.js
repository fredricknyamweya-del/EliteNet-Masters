"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import NeonInput from "../../../components/NeonInput";
import GradientButton from "../../../components/GradientButton";
import { getIssuedVouchers } from "../../../lib/vouchers";
import { generateVoucher } from "../../../lib/api";

const PACKAGES = [
  { id: 1, label: "30 Minutes", duration: 30 },
  { id: 2, label: "3 Hours",    duration: 180 },
  { id: 3, label: "6 Hours",    duration: 360 },
  { id: 4, label: "24 Hours",   duration: 1440 },
  { id: 5, label: "Weekly",     duration: 10080 },
  { id: 6, label: "Monthly",    duration: 43200 },
];

export default function IssueVoucherPage() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [clientName, setClientName] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [issuedVouchers, setIssuedVouchers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setIssuedVouchers(getIssuedVouchers());
  }, []);

  async function handleGenerate() {
    if (!selectedPackage) return;
    setGenerating(true);
    setGeneratedCode(null);
    setError("");

    try {
      const result = await generateVoucher(selectedPackage.id, clientName.trim());
      const code = result.code;
      if (!code) {
        throw new Error("Voucher code was not returned.");
      }

      const issued = {
        code,
        package: selectedPackage.label,
        client: clientName || "Walk-in",
        time: new Date().toLocaleTimeString(),
      };

      setGeneratedCode(code);
      setIssuedVouchers((prev) => [issued, ...prev]);
    } catch (requestError) {
      setError(requestError.message || "Failed to generate voucher.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 max-w-md mx-auto px-5 pt-4 pb-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-orbitron text-xl font-bold text-white">
            Issue Voucher
          </h1>
        </div>

        {/* Generate form */}
        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-4">
          <h2 className="text-[#e0f2ec] font-semibold text-sm">
            Generate New Voucher
          </h2>

          {/* Client name (optional) */}
          <NeonInput
            placeholder="Client name (optional)"
            value={clientName}
            onChange={setClientName}
            borderColor="cyan"
          />

          {/* Package selection */}
          <div className="grid grid-cols-2 gap-2">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  selectedPackage?.id === pkg.id
                    ? "border-[#22b4af] bg-[#22b4af]/20 text-[#22b4af]"
                    : "border-[#06B6D4]/30 text-white hover:border-[#06B6D4]"
                }`}
              >
                {pkg.label}
              </button>
            ))}
          </div>

          <GradientButton
            gradient="cyan-green"
            onClick={handleGenerate}
            disabled={!selectedPackage || generating}
          >
            {generating ? "Generating..." : "Generate Voucher"}
          </GradientButton>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-400">{error}</p>
            </div>
          )}
        </GlassCard>

        {/* Generated code display */}
        {generatedCode && (
          <GlassCard borderColor="green" className="p-5 flex flex-col items-center gap-3">
            <p className="text-[#e0f2ec] text-xs">Voucher code generated</p>
            <p className="font-orbitron text-2xl font-bold text-[#22b4af] tracking-widest">
              {generatedCode}
            </p>
            <p className="text-white/70 text-xs">
              Package: {selectedPackage?.label} — give this code to the client
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(generatedCode)}
              className="text-[#13caeb] text-xs underline"
            >
              Copy to clipboard
            </button>
          </GlassCard>
        )}

        {/* Recently issued */}
        {issuedVouchers.length > 0 && (
          <GlassCard borderColor="purple" className="p-5 flex flex-col gap-3">
            <h2 className="text-[#e0f2ec] font-semibold text-sm">
              Recently Issued
            </h2>
            {issuedVouchers.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-orbitron text-[#22b4af] text-sm font-bold">
                    {v.code}
                  </p>
                  <p className="text-white/60 text-xs">
                    {v.client} — {v.package}
                  </p>
                </div>
                <span className="text-white/40 text-xs">{v.time}</span>
              </div>
            ))}
          </GlassCard>
        )}

        <div className="flex justify-end">
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