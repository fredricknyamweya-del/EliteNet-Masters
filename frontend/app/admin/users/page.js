"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import GradientButton from "../../../components/GradientButton";
import NeonInput from "../../../components/NeonInput";
import { getActiveUsers } from "../../../lib/api";

const PAGE_SIZE = 5;

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const result = await getActiveUsers();
        const data = Array.isArray(result?.data) ? result.data : [];
        const normalized = data.map((item, index) => {
          const remaining = Number(item.remaining_minutes ?? 0);
          const computedStatus = item.status || (remaining > 0 ? "online" : "expired");
          return {
            id: String(item.id ?? `USR-${index + 1}`),
            name: item.name || `User ${String(item.phone_number || item.phone || "").slice(-4)}`,
            phone: item.phone_number || item.phone || "-",
            plan: item.package || "-",
            hotspot: item.hotspot || "-",
            status: computedStatus,
            uptimeMinutes: Math.max(remaining, 0),
          };
        });

        setUsers(normalized);
      } catch (requestError) {
        setError(requestError.message || "Failed to load active users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  const rows = useMemo(() => {
    let data = [...users];

    if (statusFilter !== "all") {
      data = data.filter((user) => user.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      data = data.filter(
        (user) =>
          user.name.toLowerCase().includes(q) ||
          user.phone.includes(q) ||
          user.hotspot.toLowerCase().includes(q)
      );
    }

    if (sortBy === "name_asc") data.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "name_desc") data.sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === "uptime_desc") data.sort((a, b) => b.uptimeMinutes - a.uptimeMinutes);
    if (sortBy === "uptime_asc") data.sort((a, b) => a.uptimeMinutes - b.uptimeMinutes);

    return data;
  }, [query, statusFilter, sortBy, users]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-white">Active Users</h1>
            <p className="text-sm text-white/70">Monitor current sessions and customer status.</p>
          </div>
        </div>

        <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <NeonInput
              placeholder="Search name, phone, or hotspot"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              borderColor="cyan"
            />

            <select
              aria-label="Filter users by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[#06B6D4]/35 bg-[rgba(6,182,212,0.05)] px-3 py-3 text-sm text-white outline-none"
            >
              <option value="all" className="text-black">All statuses</option>
              <option value="online" className="text-black">Online</option>
              <option value="offline" className="text-black">Offline</option>
              <option value="expired" className="text-black">Expired</option>
            </select>

            <select
              aria-label="Sort users"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="w-full rounded-xl border border-[#06B6D4]/35 bg-[rgba(6,182,212,0.05)] px-3 py-3 text-sm text-white outline-none"
            >
              <option value="name_asc" className="text-black">Name A-Z</option>
              <option value="name_desc" className="text-black">Name Z-A</option>
              <option value="uptime_desc" className="text-black">Uptime high to low</option>
              <option value="uptime_asc" className="text-black">Uptime low to high</option>
            </select>
          </div>

          {loading && (
            <p className="py-6 text-center text-sm text-white/60">Loading users...</p>
          )}
          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-400">{error}</p>
            </div>
          )}
          {!loading && !error && pagedRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/60">No users found for this filter.</p>
          ) : (
            !loading && !error && <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-white">
                <thead>
                  <tr className="border-b border-white/15 text-xs text-white/70">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Hotspot</th>
                    <th className="py-2 pr-4">Uptime</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((user) => (
                    <tr key={user.id} className="border-b border-white/10 last:border-0">
                      <td className="py-2 pr-4 font-medium">{user.name}</td>
                      <td className="py-2 pr-4">{user.phone}</td>
                      <td className="py-2 pr-4">{user.plan}</td>
                      <td className="py-2 pr-4">{user.hotspot}</td>
                      <td className="py-2 pr-4">{user.uptimeMinutes}m</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            user.status === "online"
                              ? "bg-[#10B981]/20 text-[#10B981]"
                              : user.status === "offline"
                              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
                              : "bg-[#EF4444]/20 text-[#EF4444]"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
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

        <div className="mt-2 flex justify-end">
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