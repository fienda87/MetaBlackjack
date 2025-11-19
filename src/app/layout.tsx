import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ReduxProvider } from "@/application/providers/ReduxProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// layout metadata
export const metadata: Metadata = {
  title: "Metablackjack",
  description: "Modern Blackjack stack with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
  keywords: [ "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "AI development", "React"],
  authors: [{ name: "alfienda" }],
  openGraph: {
    title: "Metablackjack",
    description: "projek ippl",
    url: "",
    siteName: "",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "creator",
    description: "powered development with modern React stack",
  },
};

// Optimize resource hints
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Optimize resource loading - prevent preload warnings */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ReduxProvider>
          {children}
          <Toaster />
        </ReduxProvider>
      </body>
    </html>
  );
}
