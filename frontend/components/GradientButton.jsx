// Gradient-filled action button.
// gradient: "cyan-green" | "purple-green" | "cyan-purple"
export default function GradientButton({
  children,
  gradient = "cyan-green",
  onClick,
  disabled = false,
  className = "",
}) {
  const gradMap = {
    "cyan-green":
      "from-[#06B6D4] via-[#10B981] to-[#22C55E] shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    "purple-green":
      "from-[#7C3AED] via-[#2563EB] to-[#10B981] shadow-[0_0_20px_rgba(124,58,237,0.4)]",
    "cyan-purple":
      "from-[#06B6D4] to-[#7C3AED] shadow-[0_0_20px_rgba(6,182,212,0.35)]",
  };

  const gradientClass = gradMap[gradient] || gradMap["cyan-green"];

