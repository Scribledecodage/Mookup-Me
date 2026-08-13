import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "gif-picker-react/style.css";

const dmSans = localFont({
  src: [
    { path: "./fonts/DM-Sans-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/DM-Sans-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/DM-Sans-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/DM-Sans-600.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

import VersionChecker from "@/components/VersionChecker";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Mookup",
  description: "La messagerie ultra-rapide et décentralisée",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mookup",
  },
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Sur Desktop, le haut du navigateur est gris clair (#f9f9f9) */
          :root { --theme-color: #f9f9f9; }
          /* Sur Mobile (largeur < 768px), le haut est blanc (#ffffff) car c'est la couleur du header mobile */
          @media (max-width: 767px) {
            :root { --theme-color: #ffffff; }
          }
        `}} />
        <meta name="theme-color" content="#f9f9f9" media="(prefers-color-scheme: light) and (min-width: 768px)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light) and (max-width: 767px)" />
        <meta name="theme-color" content="#15181e" media="(prefers-color-scheme: dark) and (min-width: 768px)" />
        <meta name="theme-color" content="#111318" media="(prefers-color-scheme: dark) and (max-width: 767px)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`min-h-full flex flex-col ${dmSans.variable}`}>
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
