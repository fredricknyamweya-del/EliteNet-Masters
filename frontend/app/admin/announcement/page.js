// frontend/app/admin/announcement/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import NeonInput from "../../../components/NeonInput";
import GradientButton from "../../../components/GradientButton";
import { publishAnnouncement, getActiveAnnouncement } from "../../../lib/api";

const EXPIRY_OPTIONS = [
  { key: "1h", label: "1 hour" },
  { key: "6h", label: "6 hours" },
  { key: "24h", label: "24 hours" },
  { key: "until_cleared", label: "Until cleared" },
];

export default function AnnouncementPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState("1h");
  const [charCount, setCharCount] = useState(0);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getActiveAnnouncement();
        if (res?.status === "success") setActiveAnnouncement(res.data || null);
      } catch {
        // ignore mock
      }
    }
    load();
  }, []);

  useEffect(() => setCharCount((message || "").length), [message]);

  const canPublish = useMemo(() => message.trim().length > 0 && message.length <= 200 && !publishing, [message, publishing]);

  async function handlePublish() {
    if (!canPublish) return;
    setPublishing(true);
    try {
      const res = await publishAnnouncement(message.trim(), expiry);
      if (res?.status === "success") {
        setActiveAnnouncement(res.data);
        setMessage("");
      }
    } catch {
      // swallow for mock
    } finally {
      setPublishing(false);
    }
  }

  function handleClearPreview() {
    setMessage("");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold font-orbitron text-[#22b4af] sm:text-4xl">Announcement</h1>
          <p className="mt-2 text-sm text-white/70 sm:text-base">Push a message to the captive portal</p>
        </header>

        <div className="space-y-6">
          <GlassCard borderColor="#7C3AED" className="p-5 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">Message (max 200 chars)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  rows={5}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220]/60 p-3 text-sm text-white placeholder:text-white/35 focus:border-[#22b4af]/60 focus:outline-none"
                  placeholder="Type the announcement that will appear on the captive portal..."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Expiry</label>
                  <select
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#07111c] px-2.5 py-2 text-sm text-white focus:outline-none"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-white/60">
                  <span className={charCount > 180 ? 'text-amber-400' : 'text-white/80'}>{charCount}</span>/200
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                <div className="flex-1">
                  <GradientButton disabled={!canPublish} onClick={handlePublish}>
                    {publishing ? 'Publishing...' : 'Publish'}
                  </GradientButton>
                </div>
                <div className="sm:w-32">
                  <GradientButton gradient="purple-green" onClick={handleClearPreview}>
                    Clear
                  </GradientButton>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard borderColor="#06B6D4" className="p-5 sm:p-6">
            <h3 className="text-lg font-orbitron text-[#22b4af]">Preview</h3>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0D1B2A]/80 p-4">
              {message.trim() ? (
                <div className="space-y-2">
                  <p className="text-base leading-relaxed text-white">{message}</p>
                  <p className="text-xs text-white/60">
                    Expires: {expiry === 'until_cleared' ? 'Until cleared' : EXPIRY_OPTIONS.find((o) => o.key === expiry)?.label}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-white/60">No message to preview.</p>
              )}
            </div>
          </GlassCard>

          <GlassCard borderColor="#7C3AED" className="p-5 sm:p-6">
            <h3 className="text-lg font-orbitron text-[#22b4af]">Currently active announcement</h3>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0D1B2A]/50 p-4">
              {activeAnnouncement ? (
                <div className="space-y-2">
                  <p className="text-base leading-relaxed text-white">{activeAnnouncement.content}</p>
                  <p className="text-xs text-white/60">Expires at: {activeAnnouncement.expires_at || 'Until cleared'}</p>
                </div>
              ) : (
                <p className="text-sm text-white/60">No active announcement</p>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="mt-8 flex justify-end">
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