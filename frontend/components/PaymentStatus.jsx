import GlassCard from "./GlassCard";

// Displays the current state of a payment: "pending" | "success" | "error"
export default function PaymentStatus({ status, flow = "payment" }) {
  if (!status) return null;

  const configs = {
    payment: {
      pending: {
        border: "cyan",
        title: "Waiting for M-Pesa confirmation",
        message: "Check your phone and enter your M-Pesa PIN.",
        color: "text-[#06B6D4]",
      },
      success: {
        border: "green",
        title: "Payment confirmed!",
        message: "You're connected. Enjoy your WiFi access.",
        color: "text-[#10B981]",
      },
      error: {
        border: "purple",
        title: "Payment failed",
        message: "Something went wrong. Please try again or use a voucher.",
        color: "text-[#EF4444]",
      },
    },
    reconnect: {
      pending: {
        border: "cyan",
        title: "Reconnecting...",
        message: "Verifying your M-Pesa code. Please wait.",
        color: "text-[#06B6D4]",
      },
      success: {
        border: "green",
        title: "Reconnected",
        message: "Your internet session is active again.",
        color: "text-[#10B981]",
      },
      error: {
        border: "purple",
        title: "Reconnect failed",
        message: "Invalid M-Pesa code. Please check and try again.",
        color: "text-[#EF4444]",
      },
    },
  };

  const selectedConfig = configs[flow] || configs.payment;
  const current = selectedConfig[status];

  // Prevent crashes if an unexpected status is passed
  if (!current) return null;

  const { border, title, message, color } = current;

 