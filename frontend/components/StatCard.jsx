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

  