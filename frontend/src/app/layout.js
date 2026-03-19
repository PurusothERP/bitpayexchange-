import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import Footer from "@/components/Footer";
import NetworkGuard from "@/components/NetworkGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "B20-LAB | Token Launchpad",
  description: "Deploy and launch your own tokens on BNB Smart Chain with B20-LAB",
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
          </NetworkGuard>
        </WalletProvider>
      </body>
    </html>
  );
}
