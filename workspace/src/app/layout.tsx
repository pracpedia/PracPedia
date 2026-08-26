import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Playfair_Display, Outfit, DM_Serif_Display } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
    icon: "/logo.svg",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#05070e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning style={{ backgroundColor: '#05070e' }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable} ${outfit.variable} ${dmSerifDisplay.variable} antialiased`}
        style={{ backgroundColor: '#05070e' }}
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
