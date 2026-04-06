import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Footer from "@/components/Footer";
import NetworkGuard from "@/components/NetworkGuard";
import ChatBox from "@/components/ChatBox";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "B20- Exchange | Intelligence Hub",
  description: "Institutional-grade market data, Traders Hub, and automated high-yield staking on BNB Smart Chain.",
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
          </NetworkGuard>
        </WalletProvider>
      </body>
    </html>
  );
}
