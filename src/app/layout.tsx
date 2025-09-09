import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppConfig } from "@/config/app.config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${AppConfig.app.name} - ${AppConfig.app.description}`,
  description: AppConfig.app.description,
  keywords: 'AI, code assistant, codebase analysis, Next.js, React, TypeScript',
  authors: [{ name: 'DumbledoorWeb Team' }],
  creator: 'DumbledoorWeb Team',
  publisher: 'DumbledoorWeb',
  robots: 'index, follow',
  openGraph: {
    title: AppConfig.app.name,
    description: AppConfig.app.description,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: AppConfig.app.name,
    description: AppConfig.app.description,
  },
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
