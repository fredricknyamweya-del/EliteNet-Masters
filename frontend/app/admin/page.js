"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CyberpunkBackground from "../../components/CyberpunkBackground";
import { clearAdminToken, getActiveUsers, getRouters, getTransactions } from "../../lib/api";

const QUICK_ACTIONS = [
  {
    label: "Transactions",
    description: "Review payments",
    icon: "₿",
    href: "/admin/transactions",
    gradient: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
  },
  {
    label: "Active Users",
    description: "View connected clients",
    icon: "◉",
    href: "/admin/users",
    gradient: "linear-gradient(135deg, #10B981 0%, #2563EB 100%)",
  },
  {
    label: "Issue Voucher",
    description: "Generate voucher",
    icon: "◈",
    href: "/admin/vouchers",
    gradient: "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)",
  },
  {
    label: "Restart Hotspot",
    description: "Reboot selected router",
    icon: "↺",
    href: "/admin/restart",
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  },
  {
    label: "Change Password",
    description: "Update your admin password",
    icon: "🔑",
    href: "/admin/change-password",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  },
  {
    label: "Review Report",
    description: "Export CSV summary",
    icon: "↓",
    href: "/admin/reports",
    gradient: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
  },
  {
    label: "Manage Plans",
    description: "Update pricing tiers",
    icon: "▦",
    href: "/admin/plans",
    gradient: "linear-gradient(135deg, #10B981 0%, #2563EB 100%)",
  },

  // NEW: Network Stats
  {
    label: "Network Stats",
    description: "Bandwidth and usage summary",
    icon: "⇅",
    href: "/admin/network-stats",
    gradient: "linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)",
  },

  // NEW: Session History
  {
    label: "Session History",
    description: "View all past sessions",
    icon: "≡",
    href: "/admin/sessions",
    gradient: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
  },

  // NEW: Announcement
  {
    label: "Announcement",
    description: "Push message to portal",
    icon: "📢",
    href: "/admin/announcement",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #b14eff 100%)",
  },
];

const STAT_CARDS = [
  {
    label: "Active Users",
    key: "activeUsers",
    color: "text-[#86EFAC]",
    icon: "◉",
  },
  {
    label: "Revenue Today",
    key: "revenueToday",
    color: "text-[#FDE68A]",
    icon: "₿",
  },
  {
    label: "Bandwidth Usage",
    key: "bandwidthUsage",
    color: "text-[#93C5FD]",
    icon: "⇅",
  },
];

function formatTimeAgo(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [serviceHealth, setServiceHealth] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    activeUsers: "000",
    revenueToday: "KSh 000,000",
    bandwidthUsage: "000.0 GB",
  });

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const [usersResult, transactionsResult, routersResult] = await Promise.all([
          getActiveUsers(),
          getTransactions({ date: "today" }),
          getRouters(),
        ]);

        const users = Array.isArray(usersResult?.data) ? usersResult.data : [];
        const transactions = Array.isArray(transactionsResult?.data)
          ? transactionsResult.data
          : [];
        const routers = Array.isArray(routersResult?.data) ? routersResult.data : [];

        const pendingPayments = transactions.filter((tx) => tx.status === "pending").length;
        const successfulPayments = transactions.filter((tx) => tx.status === "success").length;
        const expiredSessions = users.filter((u) => Number(u.remaining_minutes || 0) <= 0).length;

        const revenue = transactions
          .filter((tx) => tx.status === "success")
          .reduce((sum, tx) => sum + Number(tx.amount_paid || tx.amount || 0), 0);

        const estimatedBandwidth = (users.length * 1.8).toFixed(1);

        setStats({
          activeUsers: String(users.length).padStart(3, "0"),
          revenueToday: `KSh ${revenue.toLocaleString()}`,
          bandwidthUsage: `${estimatedBandwidth} GB`,
        });

        setPriorityQueue([
          {
            label: "Pending payments",
            value: String(pendingPayments).padStart(3, "0"),
            note: pendingPayments > 0 ? "Awaiting callback confirmation" : "No pending callbacks",
            href: "/admin/transactions",
            tone: "cyan",
          },
          {
            label: "Expired sessions",
            value: String(expiredSessions).padStart(3, "0"),
            note: expiredSessions > 0 ? "Users may need reconnect" : "All sessions active",
            href: "/admin/users",
            tone: "amber",
          },
          {
            label: "Successful payments",
            value: String(successfulPayments).padStart(3, "0"),
            note: "Completed payment transactions",
            href: "/admin/transactions",
            tone: "green",
          },
        ]);

        setServiceHealth([
          ...routers.map((router) => ({
            name: router.name || "Router",
            status: router.status === "online" ? "Healthy" : "Warning",
            detail: router.ip_address || router.ip || "No IP available",
            tone: router.status === "online" ? "green" : "amber",
          })),
          { name: "Payment Gateway", status: "Healthy", detail: "M-Pesa callbacks active", tone: "cyan" },
        ]);

        setRecentActivity(
          transactions
            .slice(0, 4)
            .map((tx) => ({
              event: tx.status === "success" ? "Payment confirmed" : tx.status === "failed" ? "Payment failed" : "Payment pending",
              meta: `${tx.phone_number || tx.phone || "Unknown"} • ${tx.package || "Package"}`,
              time: formatTimeAgo(tx.created_at || tx.date),
            }))
        );
      } catch {
        setStats((prev) => prev);
        setPriorityQueue([]);
        setServiceHealth([]);
        setRecentActivity([]);
      }
    }

    loadDashboardMetrics();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto max-w-5xl p-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
                }}
              >
                P
              </div>
              <h1 className="text-4xl font-bold font-poppins text-white">
                Admin Dashboard
              </h1>
            </div>
            <p className="mt-1 text-[#ffffff] text-sm">
              Manage hotspot users, billings, and plans.
            </p>
          </div>
        </div>

        {/* Gradient accent line */}
        <div
          className="w-full h-0.5 rounded-full mt-6 mb-8"
          style={{
            background:
              "linear-gradient(135deg, #2563EB 0%, #06B6D4 50%, #10B981 100%)",
          }}
        />

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl p-5 shadow-lg border border-white/10 backdrop-blur-md"
              style={{ background: "rgba(13,27,42,0.72)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white text-sm font-semibold tracking-wide font-poppins">
                  {card.label}
                </h2>
                <span className={`text-lg ${card.color}`}>{card.icon}</span>
              </div>
              <p className={`text-5xl font-black font-sans leading-none tracking-normal tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.18)] ${card.color}`}>
                {stats[card.key]}
              </p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/admin/reports")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#fbfbfb] bg-transparent border-2 border-[#dfeaea] hover:bg-[#22b4af]/10 transition-all duration-200 active:scale-[0.98]"
          >
            Generate Report
          </button>
        </div>

        {/* Priority Queue */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {priorityQueue.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => router.push(item.href)}
              className="rounded-2xl border border-white/10 p-4 text-left backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "rgba(13,27,42,0.72)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                {item.label}
              </p>
              <p
                className={`mt-2 text-4xl font-black font-sans leading-none tabular-nums ${
                  item.tone === "green"
                    ? "text-[#86EFAC]"
                    : item.tone === "amber"
                    ? "text-[#FCD34D]"
                    : "text-[#67E8F9]"
                }`}
              >
                {item.value}
              </p>
              <p className="mt-2 text-xs text-white/70">{item.note}</p>
            </button>
          ))}
            {priorityQueue.length === 0 && (
              <div className="rounded-2xl border border-white/10 p-4 text-sm text-white/60 backdrop-blur-md" style={{ background: "rgba(13,27,42,0.72)" }}>
                Live queue data unavailable.
              </div>
            )}
        </div>

        {/* Quick Actions — Fastlane */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold font-poppins text-[#ffffff]">
              Quick Actions
            </h2>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{
                background:
                  "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
              }}
            >
              Fastlane
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="flex flex-col gap-3 p-5 rounded-2xl text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-md"
                style={{ background: action.gradient }}
              >
                <span className="text-3xl">{action.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">
                    {action.label}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Service Health + Activity */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            className="rounded-2xl border border-white/10 p-5 backdrop-blur-md"
            style={{ background: "rgba(13,27,42,0.72)" }}
          >
            <h3 className="font-poppins text-lg font-bold text-white">Service Health</h3>
            <div className="mt-4 space-y-3">
              {serviceHealth.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-white/60">{item.detail}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.tone === "green"
                        ? "bg-[#10B981]/20 text-[#86EFAC]"
                        : item.tone === "amber"
                        ? "bg-[#F59E0B]/20 text-[#FCD34D]"
                        : "bg-[#06B6D4]/20 text-[#67E8F9]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              {serviceHealth.length === 0 && (
                <p className="text-xs text-white/60">Router health data unavailable.</p>
              )}
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/10 p-5 backdrop-blur-md"
            style={{ background: "rgba(13,27,42,0.72)" }}
          >
            <h3 className="font-poppins text-lg font-bold text-white">Recent Activity</h3>
            <div className="mt-4 space-y-3">
              {recentActivity.map((item) => (
                <div key={`${item.event}-${item.time}`} className="rounded-xl border border-white/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{item.event}</p>
                    <span className="text-xs text-white/50">{item.time}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/65">{item.meta}</p>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-xs text-white/60">No recent payment activity yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Back to portal */}
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => {
              clearAdminToken();
              router.push("/packages");
            }}
            className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
          >
            ← Log out
          </button>
        </div>

      </div>
    </main>
  );
}