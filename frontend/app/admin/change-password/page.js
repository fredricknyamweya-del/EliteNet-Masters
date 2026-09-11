"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import { changeAdminPassword } from "../../../lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = currentPassword && newPassword && confirmPassword;

  async function handleSubmit(event) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setStatus({ status: "error", message: "New passwords do not match." });
      return;
    }

    setLoading(true);
    setStatus(null);

    const result = await changeAdminPassword(currentPassword, newPassword);
    setLoading(false);

    if (result.status === "success") {
      setStatus({ status: "success", message: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    setStatus({ status: "error", message: result.message || "Could not update password." });
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto max-w-3xl p-6 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[#0f1d2f]/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.28em] text-[#9ca3af] font-semibold">
              Admin Settings
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white font-poppins">
              Change Password
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Update your admin credentials securely.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/80">
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#08141f]/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Enter current password"
                />
              </label>

              <label className="block text-sm text-white/80">
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#08141f]/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Enter new password"
                />
              </label>
            </div>

            <label className="block text-sm text-white/80">
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#08141f]/80 px-4 py-3 text-white outline-none transition focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Confirm new password"
              />
            </label>

            {status && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status.status === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Password"}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 md:w-56"
              >
                ← Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}