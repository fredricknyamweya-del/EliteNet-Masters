// A single KPI/metric card for the admin dashboard.
// trend: "up" | "down" | null
export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  gradient,
  icon,
}) {
  const gradients = {
    blue:   "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
    green:  "linear-gradient(135deg, #10B981 0%, #22C55E 100%)",
    purple: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
    cyan:   "linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)",
  };

  return (
    <div
      className="rounded-2xl p-5 text-white flex flex-col gap-3 shadow-lg"
      style={{ background: gradients[gradient] || gradients.blue }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <span className="text-xl opacity-80">{icon}</span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {subtitle && (
          <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Trend */}
      {trend && trendValue && (
        <div className="flex items-center gap-1">
          <span className="text-sm">
            {trend === "up" ? "↑" : "↓"}
          </span>
          <span className="text-white/90 text-xs font-medium">
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}