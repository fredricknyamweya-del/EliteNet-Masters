"use client";

import { useState, useEffect, useRef } from "react";
import CyberpunkBackground from "../../components/CyberpunkBackground";
import GlassCard from "../../components/GlassCard";
import NeonInput from "../../components/NeonInput";
import GradientButton from "../../components/GradientButton";
import PackageCard from "../../components/PackageCard";
import PaymentStatus from "../../components/PaymentStatus";
import LoginForm from "../../components/LoginForm";
import {
  triggerStkPush,
  checkPaymentStatus,
  getPackages,
  reconnect as reconnectSession,
} from "../../lib/api";

export default function PackagesPage() {
  const [activeTab, setActiveTab] = useState("packages");
  const [isSlidingBack, setIsSlidingBack] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phone, setPhone] = useState("");
  const [reconnectCode, setReconnectCode] = useState("");
  const [reconnectError, setReconnectError] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payStatus, setPayStatus] = useState(null);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [transactionId, setTransactionId] = useState(null);
  const pollRef = useRef(null);
  const slideBackTimeoutRef = useRef(null);

  useEffect(() => {
    async function fetchPackages() {
      try {
        const result = await getPackages();
        if (result.status === "success") {
          setPackages(
            result.packages.map((pkg) => ({
              ...pkg,
              label: pkg.name,
            }))
          );
        }
      } catch {
        setPackagesError("Unable to load packages. Please try again.");
      } finally {
        setPackagesLoading(false);
      }
    }

    fetchPackages();
  }, []);

  useEffect(() => {
    if (!transactionId || payStatus === "success" || payStatus === "error") return;

    pollRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus(transactionId);
        if (result.status === "success") {
          setPayStatus("success");
          clearInterval(pollRef.current);
        } else if (result.status === "failed" || result.status === "error") {
          setPayStatus("error");
          clearInterval(pollRef.current);
        }
      } catch {
        setPayStatus("error");
        clearInterval(pollRef.current);
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [transactionId, payStatus]);

  useEffect(() => {
    return () => {
      if (slideBackTimeoutRef.current) {
        clearTimeout(slideBackTimeoutRef.current);
      }
    };
  }, []);

  function handleBackToPackages() {
    setIsSlidingBack(true);
    slideBackTimeoutRef.current = setTimeout(() => {
      setActiveTab("packages");
      setIsSlidingBack(false);
    }, 280);
  }

  async function handlePayNow() {
    if (!selectedPackage) return;
    if (!phone.trim()) {
      setPhoneError("Please enter phone number.");
      return;
    }

    setPhoneError("");
    setPaying(true);
    setPayStatus(null);
    setTransactionId(null);
    try {
      const result = await triggerStkPush(phone, selectedPackage.id);
      setTransactionId(result.transaction_id);
      setPayStatus("pending");
    } catch {
      setPayStatus("error");
    } finally {
      setPaying(false);
    }
  }

  async function handleReconnectNow() {
    if (!reconnectCode.trim()) {
      setReconnectError("Please enter M-Pesa code.");
      setReconnectStatus(null);
      return;
    }

    setReconnectError("");
    setReconnectStatus("pending");
    setReconnecting(true);

    try {
      const result = await reconnectSession(reconnectCode.trim().toUpperCase());
      if (result.status === "success") {
        setReconnectStatus("success");
      } else {
        setReconnectStatus("error");
        setReconnectError(result.message || "Code not found or already used.");
      }
    } catch (error) {
      setReconnectStatus("error");
      setReconnectError(error.message || "Failed to reconnect account.");
    } finally {
      setReconnecting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />

      <div className="relative z-10 max-w-md mx-auto px-5 py-8 flex flex-col gap-6 text-[17px]">

        {/* Header */}
        <div>
          <p className="text-white text-lg">Sign in to EliteNet Masters </p>
          <p className="text-[#e4dfed] text-sm">EliteNet Masters.SPOT</p>
        </div>

        <h1 className="font-orbitron text-2xl font-bold text-[#22b4af] text-center tracking-wide">
          EliteNet Masters WIFI Login
        </h1>

        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-[#06B6D4]/30">
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "packages"
                ? "bg-[#22b4af] text-[#0D1B2A]"
                : "text-[#efe9fa] hover:bg-[#06B6D4]/10"
            }`}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === "login"
                ? "bg-[#22b4af] text-white"
                : "text-[#efe9fa] hover:bg-[#7C3AED]/10"
            }`}
          >
            Login
          </button>
        </div>

        {/* PACKAGES TAB */}
        {activeTab === "packages" && (
          <>
            {/* How to purchase */}
            <GlassCard borderColor="cyan" className="p-5">
              <h2 className="block w-full text-center text-sm font-medium text-white underline underline-offset-4 hover:text-cyan-200">
                How to Purchase
              </h2>
              <ol className="text-white text-sm space-y-2 list-decimal list-inside">
                <li>Tap on the package of your choice.</li>
                <li>Enter your phone number</li>
                <li>Click &quot;PAY NOW&quot;</li>
                <li>
                  Enter your M-Pesa PIN and wait about 30 seconds for authentication.
                </li>
              </ol>
              <p className="text-[#e0f2ec] text-xs text-center mt-3">
                (Customer care: +254 757 77669)
              </p>
            </GlassCard>

            {/* Package grid */}
            {packagesLoading && (
              <p className="text-center text-white/60 text-sm">Loading packages...</p>
            )}
            {packagesError && (
              <p className="text-center text-red-300 text-sm">{packagesError}</p>
            )}
            {!packagesLoading && !packagesError && packages.length === 0 && (
              <p className="text-center text-white/60 text-sm">No packages are currently available.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPackage?.id === pkg.id}
                  onSelect={setSelectedPackage}
                />
              ))}
            </div>

            {/* Phone input + Pay Now */}
            {selectedPackage && (
              <GlassCard borderColor="green" className="p-5 flex flex-col gap-3">
                <p className="text-white text-sm text-center">
                  Selected:{" "}
                  <span className="text-[#10B981]">{selectedPackage.label}</span>{" "}
                  — KSh {selectedPackage.price}
                </p>
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
                <GradientButton
                  gradient="cyan-green"
                  onClick={handlePayNow}
                  className={paying ? "opacity-60 pointer-events-none" : ""}
                >
                  {paying ? "Processing..." : "Pay Now"}
                </GradientButton>
                {phoneError && (
                  <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center" role="alert">
                    <p className="font-medium text-red-400">{phoneError}</p>
                  </div>
                )}
                <PaymentStatus status={payStatus} />
              </GlassCard>
            )}

            {/* Reconnect */}
            <GlassCard borderColor="purple" className="p-5 flex flex-col gap-3">
              <h2 className="text-[#f6f9f8] text-center font-semibold">
                Reconnect account
              </h2>
              <p className="text-white text-xs text-center">
                Enter the M-Pesa code from your payment, for example QAH9QWWZRR.
              </p>
              <div className="flex flex-col gap-3">
                <NeonInput
                  placeholder="Enter M-Pesa code you paid with"
                  value={reconnectCode}
                  onChange={(value) => {
                    setReconnectCode(value.toUpperCase());
                    if (reconnectError) setReconnectError("");
                    if (reconnectStatus) setReconnectStatus(null);
                  }}
                  borderColor="purple"
                />
                <GradientButton
                  gradient="cyan-green"
                  onClick={handleReconnectNow}
                  disabled={reconnecting}
                >
                  {reconnecting ? "Reconnecting..." : "Reconnect"}
                </GradientButton>
              </div>
              {reconnectError && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center" role="alert">
                  <p className="font-medium text-red-400">{reconnectError}</p>
                </div>
              )}
              <PaymentStatus status={reconnectStatus} flow="reconnect" />
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"

              >
                Login →
              </button>
            </GlassCard>

            {/* Voucher link */}
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            >
              Have a voucher code instead?
            </button>
          </>
        )}

        {/* LOGIN TAB */}
        {activeTab === "login" && (
          <div
            className={`transition-all duration-300 ease-out ${
              isSlidingBack ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
            }`}
          >
            <LoginForm onBackToPackages={handleBackToPackages} />
          </div>
        )}
        </div>
        </main>
    )
    }