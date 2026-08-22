import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PracPedia — Practical Notebook Gallery",
  description:
    "PracPedia: The ultimate practical notebook encyclopedia and study gallery for physics, chemistry, biology, and ICT experiments.",
  keywords: [
    "PracPedia",
    "Practical Notebook",
    "Gallery",
    "Physics",
    "Chemistry",
    "Biology",
    "ICT",
    "Higher Math",
    "Education",
  ],
  authors: [{ name: "PracPedia Team" }],
  icons: {
    icon: "/pracpedia_logo.jpg",
  },
  openGraph: {
    title: "PracPedia — Practical Notebook Gallery",
    description:
      "The ultimate practical notebook encyclopedia and study gallery.",
    siteName: "PracPedia",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PracPedia — Practical Notebook Gallery",
    description:
      "The ultimate practical notebook encyclopedia and study gallery.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
