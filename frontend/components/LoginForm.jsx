"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "./GlassCard";
import GradientButton from "./GradientButton";
import NeonInput from "./NeonInput";
import { activateVoucher, login } from "../lib/api";


export default function LoginForm({ onBackToPackages }){

const router = useRouter()
// defining states
const [username,setUsername] = useState("");
const [password,setPassword] = useState("");

const [loading,setLoading] = useState(false)
const [message,setMessage] = useState("")
const [success,setSuccess] = useState(false)

const [voucherCode, setVoucherCode] = useState("");
const [voucherLoading, setVoucherLoading] = useState(false);
const [voucherMessage, setVoucherMessage] = useState("");
const [voucherSuccess, setVoucherSuccess] = useState(false);

// handles login and redirects to admin page
  async function handleLogin(){
      if(!username || !password){
         setSuccess(false)
        setMessage ("Please enter Username and Password.")
        return
      }
      setLoading(true)
      setMessage("")

      try {
        const result = await login(username.trim(), password);
        if (result.status !== "success") {
          setSuccess(false);
          setMessage(result.message || "Invalid username or password.");
          setLoading(false);
          return;
        }

        setLoading(false)
        setSuccess(true)
        setMessage(" Redirecting...")

        setTimeout(() => {
          router.push("/admin")
        }, 500)
      } catch (error) {
        setSuccess(false);
        setLoading(false);
        setMessage(error.message || "Login failed. Try again.");
      }

    }
   // handles voucher activation from login page
   async function handleActivateVoucher(){
  const code = voucherCode.trim().toUpperCase();

  if (!code) {
    setVoucherSuccess(false)
    setVoucherMessage("Please enter a voucher code.");
    return;
  }

  setVoucherLoading(true);
  setVoucherMessage("");

  try {
    const result = await activateVoucher(code);
    setVoucherLoading(false);

    if (result.status !== "success") {
      setVoucherSuccess(false);
      setVoucherMessage(result.message || "Invalid or already used voucher code.");
      return;
    }

    setVoucherSuccess(true)
    setVoucherMessage(result.message || "Access granted! You are now connected.");
    setVoucherCode("");
  } catch (error) {
    setVoucherLoading(false);
    setVoucherSuccess(false);
    setVoucherMessage(error.message || "Failed to activate voucher.");
  }
}


   return(
    <>
  
    <div className="w-full max-w-md space-y-6">
      
      {/* LOGIN CARD */}
      <GlassCard
        borderColor="purple"
        className="p-8"
      >
        <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">
          EliteNet Masters WIFI Login
        </h2>

        <p className="text-center text-gray-300 mb-8">
          Enter your username and password to login.
        </p>

        <div className="space-y-5">
          <NeonInput
            placeholder="Username"
            value={username}
            onChange={setUsername}
          />

          <NeonInput
            type="password"
            placeholder="Password"
            borderColor="purple"
            value={password}
            onChange={setPassword}
          />

          <GradientButton
            gradient="cyan-green"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Logging In..." : "Login"}
          </GradientButton>

          {loading && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
              <p className="text-sm font-medium text-cyan-300">
                Authenticating...
              </p>
            </div>
          )}

          {success && !loading && (
            <div className="rounded-xl border border-green-400/40 bg-green-500/10 p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400 bg-green-500/10">
                <svg
                  className="h-7 w-7 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h3 className="mt-3 text-lg font-bold text-green-400">
                Login Successful
              </h3>

              <p className="mt-1 text-sm text-gray-300">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {message && !loading && !success && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-center">
              <p className="font-medium text-red-400">
                {message}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* VOUCHER CARD */}
      <GlassCard
        borderColor="cyan"
        className="p-6"
      >
        <h2 className="text-2xl font-bold text-center text-cyan-300">
          Activate Voucher
        </h2>

        <p className="mt-2 mb-5 text-center text-sm text-gray-300">
          Enter your voucher code below to restore internet access.
        </p>

        <div className="space-y-4">
          <NeonInput
            placeholder="Enter voucher code"
            value={voucherCode}
            onChange={setVoucherCode}
          />

          <GradientButton
            gradient="cyan-green"
            onClick={handleActivateVoucher}
            disabled={voucherLoading}
          >
            {voucherLoading ? "Activating..." : "Activate Voucher"}
          </GradientButton>

          {voucherMessage && (
            <div
              className={`rounded-xl border p-4 text-center ${
                voucherSuccess
                  ? "border-green-400/40 bg-green-500/10 text-green-400"
                  : "border-red-400/40 bg-red-500/10 text-red-400"
              }`}
            >
              {voucherMessage}
            </div>
          )}
        </div>
      </GlassCard>

      <button
      // routing back to packages 
        type="button"
        onClick={() => {
          if (onBackToPackages) {
            onBackToPackages();
            return;
          }
          router.push("/packages");
        }}
        className="block w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-center text-base font-semibold tracking-wide text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
      >
        View Packages & Purchase
      </button>
    </div>
  
        </>
   )
}