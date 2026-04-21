import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://recipe-box-gs.vercel.app"
  ),
  title: "RecipeBox",
  description: "Save and manage your favorite recipes",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "RecipeBox",
    description: "Every recipe you love, beautifully saved.",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://recipe-box-gs.vercel.app",
    siteName: "RecipeBox",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecipeBox",
    description: "Every recipe you love, beautifully saved.",
  },
  other: {
    "theme-color": "#234b39",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "RecipeBox",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable}`}>
      <body>
        {/* @ts-ignore Providers is an async server component */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
