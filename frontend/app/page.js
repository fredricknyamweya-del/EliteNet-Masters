import { Poppins } from "next/font/google";
import "../styles/globals.css";

// Load the Poppins font for the entire frontend
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "EliteNet Masters WiFi",
  description: "WiFi hotspot billing portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable}`} suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}