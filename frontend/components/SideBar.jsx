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

 