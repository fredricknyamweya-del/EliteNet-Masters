"use client";

import CyberpunkBackground from "../components/CyberpunkBackground";
import GradientButton from "../components/GradientButton";

export default function GlobalError({ error, reset }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-5 px-5 py-8 text-center">
        <h1 className="font-orbitron text-2xl font-bold text-[#EF4444]">
          Something went wrong
        </h1>
        <p className="text-sm text-white/80">
          {error?.message || "An unexpected error occurred."}
        </p>
        <GradientButton gradient="cyan-green" onClick={() => reset()}>
          Try Again
        </GradientButton>
      </div>
    </main>
  );
}
