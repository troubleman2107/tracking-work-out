import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BottomNav } from "@/components/layout/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IronLog — Workout Tracker",
    template: "%s | IronLog",
  },
  description:
    "Track progressive overload, log sets, and plan workouts with IronLog — your personal strength training companion.",
  keywords: ["workout tracker", "progressive overload", "gym log", "strength training"],
  authors: [{ name: "IronLog" }],
  creator: "IronLog",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "IronLog — Workout Tracker",
    description: "Track progressive overload and plan workouts",
    siteName: "IronLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background`}>
        {/* Main content — leave padding at bottom for BottomNav */}
        <main className="min-h-screen pb-24">{children}</main>
        <BottomNav />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
