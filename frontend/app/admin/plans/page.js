"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../../components/CyberpunkBackground";
import GlassCard from "../../../components/GlassCard";
import NeonInput from "../../../components/NeonInput";
import GradientButton from "../../../components/GradientButton";
import { createPlan, deletePlan, getPlans, updatePlan } from "../../../lib/api";

export default function ManagePlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: "", price: "", duration: "" });

  // Load plans from backend on mount
  useEffect(() => {
    async function fetchPlans() {
      try {
        const result = await getPlans();
        if (result.status === "success") {
          setPlans(result.data);
        }
      } catch {
        setError("Failed to load plans. Check backend connection.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  function startEdit(plan) {
    setEditingId(plan.id);
    setEditPrice(String(plan.price));
    setSavedId(null);
  }

  async function handleSave(planId) {
    const numericPrice = Number(editPrice);

    if (!editPrice || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Enter a valid price greater than zero.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await updatePlan(planId, numericPrice);

      if (result.status === "success") {
        const updatedPlan = result.data || { id: planId, price: numericPrice };

        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? { ...p, ...updatedPlan, price: Number(updatedPlan.price ?? numericPrice) }
              : p
          )
        );

        setSavedId(planId);
        setEditingId(null);
        return;
      }

      setError(result.message || "Failed to update plan. Try again.");
    } catch {
      setError("Failed to update plan. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const price = Number(newPlan.price);
    const duration = Number(newPlan.duration);
    if (!newPlan.name.trim() || !Number.isFinite(price) || price <= 0 || !Number.isInteger(duration) || duration <= 0) {
      setError("Enter a plan name, positive price, and positive whole-minute duration.");
      return;
    }
    try {
      const result = await createPlan(newPlan.name.trim(), price, duration);
      setPlans((prev) => [...prev, result.data]);
      setNewPlan({ name: "", price: "", duration: "" });
    } catch (requestError) {
      setError(requestError.message || "Failed to create plan.");
    }
  }

  async function handleDelete(planId) {
    setDeletingId(planId);
    setError(null);
    try {
      await deletePlan(planId);
      setPlans((prev) => prev.filter((plan) => plan.id !== planId));
    } catch (requestError) {
      setError(requestError.message || "Failed to archive plan.");
    } finally {
      setDeletingId(null);
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
              Manage Plans
            </h1>
            <p className="text-[#e4dfed] text-xs mt-0.5">
              Update pricing tiers
            </p>
          </div>
        </div>

        <p className="text-white/60 text-xs">
          Tap a plan to edit its price. Changes update immediately on the
          client portal.
        </p>

        <GlassCard borderColor="green" className="p-5 flex flex-col gap-3">
          <h2 className="text-[#e0f2ec] font-semibold text-sm">Create plan</h2>
          <NeonInput placeholder="Plan name" value={newPlan.name} onChange={(value) => setNewPlan((prev) => ({ ...prev, name: value }))} borderColor="cyan" />
          <div className="grid grid-cols-2 gap-2">
            <NeonInput placeholder="Price (KSh)" type="number" value={newPlan.price} onChange={(value) => setNewPlan((prev) => ({ ...prev, price: value }))} borderColor="cyan" />
            <NeonInput placeholder="Minutes" type="number" value={newPlan.duration} onChange={(value) => setNewPlan((prev) => ({ ...prev, duration: value }))} borderColor="cyan" />
          </div>
          <GradientButton onClick={handleCreate}>Create plan</GradientButton>
        </GlassCard>

        {/* Error state */}
        {error && (
          <GlassCard borderColor="purple" className="p-4">
            <p className="text-[#EF4444] text-xs text-center">{error}</p>
          </GlassCard>
        )}

        {/* Loading state */}
        {loading ? (
          <GlassCard borderColor="cyan" className="p-8 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#06B6D4]/30 border-t-[#06B6D4] rounded-full animate-spin" />
            <p className="text-white/50 text-xs">Loading plans...</p>
          </GlassCard>
        ) : (
          <GlassCard borderColor="cyan" className="p-5 flex flex-col gap-3">
            <h2 className="text-[#e0f2ec] font-semibold text-sm">
              Pricing Tiers
            </h2>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border-b border-white/10 pb-3 last:border-0 last:pb-0"
              >
                {editingId === plan.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-semibold text-sm">
                        {plan.name}
                      </p>
                      <span className="text-white/40 text-xs">
                        {plan.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <NeonInput
                          placeholder="New price (KSh)"
                          type="number"
                          value={editPrice}
                          onChange={setEditPrice}
                          borderColor="cyan"
                        />
                      </div>
                      <button
                        onClick={() => handleSave(plan.id)}
                        disabled={saving}
                        className="px-4 rounded-xl text-sm font-bold text-white shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #06B6D4 0%, #10B981 100%)",
                        }}
                      >
                        {saving ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 rounded-xl text-sm text-white/60 border border-white/20"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {plan.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {plan.duration_minutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {savedId === plan.id && (
                        <span className="text-[#10B981] text-xs">Saved ✓</span>
                      )}
                      <p className="font-orbitron text-[#22b4af] font-bold text-sm">
                        KSh {plan.price}
                      </p>
                      <button
                        onClick={() => startEdit(plan)}
                        className="text-[#13caeb] text-xs underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deletingId === plan.id}
                        aria-label={`Delete ${plan.name}`}
                        className="text-red-300 text-xs underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === plan.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
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