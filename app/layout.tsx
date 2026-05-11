import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentNinja AI | JTekNinja.com",
  description:
    "RentNinja AI by JTekNinja.com. Multi-tenant tenant screening SaaS built with Next.js, MongoDB Atlas, Auth.js, and Stripe-ready billing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-[#0b0f14] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
