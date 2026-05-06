import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Footer from "@/components/Footer";
import NetworkGuard from "@/components/NetworkGuard";
import ChatBox from "@/components/ChatBox";
import MobileBottomNav from "@/components/MobileBottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mexapay | Intelligence Hub",
  description: "Institutional-grade market data, Traders Hub, and automated high-yield staking on BNB Smart Chain.",
};

// ── CRITICAL: Mobile viewport scaling ─────────────────────────────────────────
// Without this, mobile browsers render at ~1280px desktop width and ALL CSS
// media queries are completely ignored. This is the #1 mobile fix.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f59e0b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <WalletProvider>
          <NetworkGuard>
            <div className="flex-grow">
              {children}
            </div>
            <Footer />
            <ChatBox />
            <MobileBottomNav />
          </NetworkGuard>
        </WalletProvider>
      </body>
    </html>
  );
}
