import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Personal Finance Dashboard | వ్యక్తిగత ఆర్థిక నిర్వహణ",
  description: "Personal finance and wealth management dashboard with English and Telugu language support",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
