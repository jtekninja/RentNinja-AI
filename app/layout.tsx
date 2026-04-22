import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "RentNinja AI | JTekNinja.com",
  description:
    "RentNinja AI by JTekNinja.com. Multi-tenant tenant screening SaaS built with Next.js, MongoDB Atlas, Auth.js, and Stripe-ready billing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} bg-[#0b0f14] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
