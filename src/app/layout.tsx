import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppConfig } from "@/config/app.config";
import { AuthProvider } from "@/components/AuthProvider";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

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
  authors: [{ name: 'Jarvis Team' }],
  creator: 'Jarvis Team',
  publisher: 'Jarvis',
  robots: 'index, follow',
  manifest: '/manifest.json',
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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: AppConfig.app.name,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FF970A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Favicon and Icons */}
        <link rel="icon" href="/jarvis.png" type="image/png" />
        <link rel="alternate icon" href="/jarvis.png" />
        <link rel="apple-touch-icon" href="/jarvis.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/jarvis.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/jarvis.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/jarvis.png" />
        
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Jarvis" />
        
        {/* iOS Specific Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jarvis" />
        
        {/* Windows Specific Meta Tags */}
        <meta name="msapplication-TileImage" content="/jarvis.png" />
        <meta name="msapplication-TileColor" content="#FF970A" />
        <meta name="msapplication-navbutton-color" content="#FF970A" />
        <meta name="msapplication-starturl" content="/" />
        
        {/* Android Chrome */}
        <meta name="theme-color" content="#FF970A" />
        <meta name="color-scheme" content="light" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <PWAInstallPrompt />
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
