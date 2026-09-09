// Glassmorphic card with a glowing colored border.
// borderColor: "cyan" | "purple" | "green"
export default function GlassCard({ children, borderColor = "cyan", className = "" }) {
  const borderMap = {
    cyan:   "border-[#06B6D4]/40 shadow-[0_0_18px_rgba(6,182,212,0.18),inset_0_1px_0_rgba(6,182,212,0.1)]",
    purple: "border-[#7C3AED]/40 shadow-[0_0_18px_rgba(124,58,237,0.2),inset_0_1px_0_rgba(124,58,237,0.1)]",
    green:  "border-[#10B981]/40 shadow-[0_0_18px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(16,185,129,0.08)]",
  };