import "../styles/globals.css";

export const metadata = {
  title: "EliteNet Masters WiFi",
  description: "WiFi hotspot billing portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}