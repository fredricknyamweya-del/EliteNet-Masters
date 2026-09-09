import { usePathname } from "next/navigation";

// Admin-only sidebar — not part of the client-facing portal flow.
// Only rendered inside app/admin/* pages.
const NAV_ITEMS = [
  { label: "Dashboard",     href: "/admin",              icon: "⊞" },
  { label: "Transactions",  href: "/admin/transactions", icon: "₿" },
  { label: "Active Users",  href: "/admin/users",        icon: "◉" },
  { label: "Vouchers",      href: "/admin/vouchers",     icon: "◈" },
  { label: "Reports",       href: "/admin/reports",      icon: "▤" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0D1B2A 0%, #162B45 100%)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
            }}
          >
            P
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              EliteNet Masters
            </p>
            <p className="text-[#94A3B8] text-[10px]">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                transition-all duration-150
                ${
                  active
                    ? "bg-[#2563EB] text-white font-semibold"
                    : "text-[#94A3B8] hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[#475569] text-xs">EliteNet Masters Billing v1.0</p>
      </div>
    </aside>
  );
}