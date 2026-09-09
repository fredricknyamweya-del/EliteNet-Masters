// Top navigation bar — used on client-facing pages.
// Shows branding on the left and optional action on the right.
export default function TopBar({ action }) {
  return (
    <header className="w-full bg-white border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{
              background:
                "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
            }}
          >
            P
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-sm leading-tight">
             EliteNet Masters WiFi
            </p>
            <p className="text-[#94A3B8] text-[10px]">EliteNet Masters</p>
          </div>
        </div>

        {/* Optional right-side action (e.g. a link or button) */}
        {action && <div>{action}</div>}
      </div>

      {/* Gradient accent line */}
      <div
        className="h-0.5 w-full"
        style={{
          background:
            "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
        }}
      />
    </header>
  );
}