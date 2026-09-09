// A titled section wrapper — used to group related content
// on any page (e.g. admin panel sections, settings groups).
export default function SectionCard({
  title,
  subtitle,
  children,
  action,
  className = "",
}) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm ${className}`}>
      {/* Card header */}
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            {title && (
              <h2 className="text-[#0F172A] font-semibold text-sm">{title}</h2>
            )}
            {subtitle && (
              <p className="text-[#94A3B8] text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {/* Card body */}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}