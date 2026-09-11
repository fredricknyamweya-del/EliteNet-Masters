"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CyberpunkBackground from "../../components/CyberpunkBackground";
import GlassCard from "../../components/GlassCard";
import GradientButton from "../../components/GradientButton";
import NeonInput from "../../components/NeonInput";
import PaymentStatus from "../../components/PaymentStatus";
import { checkPaymentStatus, triggerStkPush } from "../../lib/api";

const PACKAGES = [
  { id: 1, label: "30minutes", price: 5 },
  { id: 2, label: "1hour",     price: 10 },
  { id: 3, label: "3hours",    price: 20 },
  { id: 4, label: "6hours",    price: 60 },
  { id: 5, label: "24hours",   price: 100 },
  { id: 6, label: "Weekly",    price: 300 },
];

export default function PaymentPage() {
  const router = useRouter();
  const pollRef = useRef(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [transactionId, setTransactionId] = useState(null);

  useEffect(() => {
    if (!transactionId || paymentStatus === "success" || paymentStatus === "error") return;

    pollRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(transactionId);
        if (result.status === "success") {
          setPaymentStatus("success");
          clearInterval(pollRef.current);
        } else if (result.status === "failed" || result.status === "error") {
          setPaymentStatus("error");
          clearInterval(pollRef.current);
        }
      } catch {
        setPaymentStatus("error");
        clearInterval(pollRef.current);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [transactionId, paymentStatus]);

  async function handlePayNow() {
    if (!selectedPackage) return;
    if (!phone.trim()) {
      setPhoneError("Enter phone number");
      return;
    }

    setPhoneError("");
    setLoading(true);
    setPaymentStatus(null);
    setTransactionId(null);

    try {
      const response = await triggerStkPush(phone.trim(), selectedPackage.id);
      setTransactionId(response.transaction_id);
      setPaymentStatus("pending");
    } catch {
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-5 px-5 py-8">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[#22b4af]">Make Payment</h1>
          <p className="mt-1 text-sm text-white/70">Select a package and pay with M-Pesa.</p>
        </div>

        <GlassCard borderColor="cyan" className="p-5">
          <p className="mb-3 text-sm font-semibold text-white">Choose package</p>
          <div className="grid grid-cols-2 gap-2">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => {
                  setSelectedPackage(pkg);
                  setPaymentStatus(null);
                }}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  selectedPackage?.id === pkg.id
                    ? "border-[#22b4af] bg-[#22b4af]/20 text-[#22b4af]"
                    : "border-[#06B6D4]/30 text-white hover:border-[#06B6D4]"
                }`}
              >
                {pkg.label} - KSh {pkg.price}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard borderColor="green" className="p-5 flex flex-col gap-3">
          <NeonInput
            placeholder="Enter your phone number"
            type="tel"
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (phoneError) setPhoneError("");
            }}
            borderColor="cyan"
          />
          {phoneError && (
            <p className="text-xs text-[#EF4444]" role="alert">
              {phoneError}
            </p>
          )}
          <GradientButton
            gradient="cyan-green"
            onClick={handlePayNow}
            disabled={loading || !selectedPackage}
          >
            {loading ? "Processing..." : "Pay Now"}
          </GradientButton>
          <PaymentStatus status={paymentStatus} />
        </GlassCard>

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
