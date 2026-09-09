import GlassCard from "./GlassCard";

// A single tappable package tile in the pricing grid.
export default function PackageCard({ pkg, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      className="text-left w-full"
    >
      <GlassCard
        borderColor={selected ? "green" : "purple"}
        className={`p-5 flex flex-col items-center justify-center gap-1.5 h-full transition-all duration-200 ${
          selected ? "scale-[1.03]" : ""
        }`}
      >
        <span className="font-orbitron text-[15px] font-bold text-[#c6d4b8]">
          {pkg.label}
        </span>

        <span className="text-[#e4e8e9] font-semibold text-sm">
          KSH:{pkg.price}/-
        </span>

        {/* Render only when this package is selected */}
        {selected && (
          <span className="mt-2 rounded-full bg-green-500 px-2 py-1 text-xs font-semibold text-white">
            Selected
          </span>
        )}
      </GlassCard>
    </button>
  );
}