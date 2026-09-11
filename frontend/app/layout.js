import "../styles/globals.css";

export const metadata = {
  title: "EliteNet Masters",
  description: "WiFi hotspot billing and management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
