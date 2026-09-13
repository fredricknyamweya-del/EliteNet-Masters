"use client";

import CyberpunkBackground from "../../../components/CyberpunkBackground";
import LoginForm from "../../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <CyberpunkBackground />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center px-5 py-8 text-[17px]">
        <LoginForm />
      </div>
    </main>
  );
}
