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


  