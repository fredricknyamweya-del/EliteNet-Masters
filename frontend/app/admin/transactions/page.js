"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import GradientButton from "../../../components/GradientButton";
import NeonInput from "../../../components/NeonInput";
import { getTransactions } from "../../../lib/api";

const PAGE_SIZE = 5;

export default function AdminTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      setError("");
      try {
        const result = await getTransactions();
        const data = Array.isArray(result?.data) ? result.data : [];
        const normalized = data.map((item, index) => ({
          id: String(item.id ?? `TXN-${index + 1}`),
          phone: item.phone_number || item.phone || "-",
          package: item.package || "-",
          amount: Number(item.amount_paid ?? item.amount ?? 0),
          code: item.mpesa_receipt_number || item.code || "-",
          status: item.status || "pending",
          date: String(item.created_at || item.date || "").slice(0, 10),
        }));

        setTransactions(normalized);
      } catch (requestError) {
        setError(requestError.message || "Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const filtered = useMemo(() => {
    let rows = [...transactions];

    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.phone.includes(q) ||
          row.code.toLowerCase().includes(q) ||
          row.id.toLowerCase().includes(q)
      );
    }

    if (sortBy === "amount_desc") rows.sort((a, b) => b.amount - a.amount);
    if (sortBy === "amount_asc") rows.sort((a, b) => a.amount - b.amount);
    if (sortBy === "date_desc") rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    if (sortBy === "date_asc") rows.sort((a, b) => (a.date > b.date ? 1 : -1));

    return rows;
  }, [query, statusFilter, sortBy, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(start, start + PAGE_SIZE);

  const successRevenue = filtered
    .filter((row) => row.status === "success")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-white">Transactions</h1>
            <p className="text-sm text-white/70">Track M-Pesa payments and delivery status.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GlassCard borderColor="cyan" className="p-4">
            <p className="text-xs text-white/70">Transactions</p>
            <p className="mt-1 font-orbitron text-xl font-bold text-white">{filtered.length}</p>
          </GlassCard>
          <GlassCard borderColor="green" className="p-4">
            <p className="text-xs text-white/70">Successful revenue</p>
            <p className="mt-1 font-orbitron text-xl font-bold text-[#10B981]">KSh {successRevenue}</p>
          </GlassCard>
          <GlassCard borderColor="purple" className="p-4">
            <p className="text-xs text-white/70">Failed/Pending</p>
            <p className="mt-1 font-orbitron text-xl font-bold text-[#F59E0B]">
              {filtered.filter((row) => row.status !== "success").length}
            </p>
          </GlassCard>
        </div>

        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <NeonInput
              placeholder="Search by phone, code, or txn ID"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              borderColor="cyan"
            />

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#06B6D4]/35 bg-[rgba(6,182,212,0.05)] px-3 py-3 text-sm text-white outline-none"
            >
              <option value="all" className="text-black">All statuses</option>
              <option value="success" className="text-black">Success</option>
              <option value="failed" className="text-black">Failed</option>
              <option value="pending" className="text-black">Pending</option>
            </select>

            <select
              aria-label="Sort transactions"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full rounded-xl border border-[#06B6D4]/35 bg-[rgba(6,182,212,0.05)] px-3 py-3 text-sm text-white outline-none"
            >
              <option value="date_desc" className="text-black">Newest first</option>
              <option value="date_asc" className="text-black">Oldest first</option>
              <option value="amount_desc" className="text-black">Amount high to low</option>
              <option value="amount_asc" className="text-black">Amount low to high</option>
            </select>
          </div>

          {loading && (
            <p className="py-6 text-center text-sm text-white/60">Loading transactions...</p>
          )}
          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && pagedRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/60">No transactions found for this filter.</p>
          ) : (
            !loading && !error && <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-white">
                <thead>
                  <tr className="border-b border-white/15 text-xs text-white/70">
                    <th className="py-2 pr-4">Txn ID</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Package</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/10 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.id}</td>
                      <td className="py-2 pr-4">{row.phone}</td>
                      <td className="py-2 pr-4">{row.package}</td>
                      <td className="py-2 pr-4">KSh {row.amount}</td>
                      <td className="py-2 pr-4 font-sans text-sm font-semibold tracking-wide tabular-nums text-[#67E8F9]">{row.code}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            row.status === "success"
                              ? "bg-[#10B981]/20 text-[#10B981]"
                              : row.status === "pending"
                              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                              : "bg-[#EF4444]/20 text-[#EF4444]"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-xs text-white/70">
            <p>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-white/20 px-3 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="rounded-lg border border-white/20 px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </GlassCard>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 sm:w-auto sm:min-w-52 md:w-56"
          >
            ← Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}