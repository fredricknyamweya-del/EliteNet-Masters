// A titled section wrapper — used to group related content
// on any page (e.g. admin panel sections, settings groups).
export default function SectionCard({
  title,
  subtitle,
  children,
  action,
  className = "",
}) {
  