"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import GradientButton from "../../../components/GradientButton";
import { getTransactions } from "../../../lib/api";

function exportCSV(data) {
  const headers = ["Phone", "Package", "Amount (KSh)", "M-Pesa Code", "Date", "Status"];
  const rows = data.map((t) => [
    t.phone, t.package, t.amount, t.mpesa_code, t.date, t.status,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `primesurfnet-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      setError("");
      try {
        const result = await getTransactions(filter === "all" ? {} : { status: filter });
        const data = Array.isArray(result?.data) ? result.data : [];

        const normalized = data.map((item) => ({
          id: item.id,
          phone: item.phone_number || item.phone || "-",
          package: item.package || "-",
          amount: Number(item.amount_paid ?? item.amount ?? 0),
          mpesa_code: item.mpesa_receipt_number || item.mpesa_code || "-",
          date: String(item.created_at || item.date || "").slice(0, 10),
          status: item.status || "pending",
        }));

        setTransactions(normalized);
      } catch (requestError) {
        setError(requestError.message || "Failed to load report data.");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, [filter]);

  const filtered = transactions;

  const totalRevenue = filtered
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-4 pb-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-orbitron text-xl font-bold text-white">
            Review Report
          </h1>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard borderColor="cyan" className="p-4 flex flex-col gap-1">
            <p className="text-white text-xs">Total Revenue</p>
            <p className="font-orbitron text-[#ffffff] text-xl font-bold">
              KSh {totalRevenue}
            </p>
          </GlassCard>
          <GlassCard borderColor="green" className="p-4 flex flex-col gap-1">
            <p className="text-white text-xs">Transactions</p>
            <p className="font-orbitron text-[#eff9f6] text-xl font-bold">
              {filtered.length}
            </p>
          </GlassCard>
        </div>

        {/* Filter + Export */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-[#06B6D4]/30 flex-1">
            {["all", "success", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-xs font-semibold capitalize transition-all duration-200 ${
                  filter === f
                    ? "bg-[#22b4af] text-[#0D1B2A]"
                    : "text-[#efe9fa] hover:bg-[#06B6D4]/10"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
            }}
          >
            Export CSV
          </button>
        </div>

        {/* Transaction list */}
        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-3">
          <h2 className="text-[#e0f2ec] font-semibold text-sm">
            Transactions
          </h2>
          {loading && (
            <p className="text-white/60 text-xs text-center py-4">
              Loading transactions...
            </p>
          )}
          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-white/40 text-xs text-center py-4">
              No transactions found.
            </p>
          )}
          {!loading && !error && filtered.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-white text-sm font-semibold">{t.phone}</p>
                <p className="text-white/70 text-xs">
                  {t.package} — {t.mpesa_code}
                </p>
                <p className="text-white/40 text-xs">{t.date}</p>
              </div>
              <div className="text-right flex flex-col gap-1">
                <p className="text-[#fcfcfc] font-bold text-sm">
                  KSh {t.amount}
                </p>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    t.status === "success"
                      ? "bg-[#10B981]/20 text-[#25e1e1]"
                      : "bg-[#EF4444]/20 text-[#EF4444]"
                  }`}
                >
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </GlassCard>
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