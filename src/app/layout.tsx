import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import type { ReactElement } from "react";
import NotificationProvider from "@/components/providers/NotificationProvider";
import ServiceWorkerRegister from "@/components/providers/ServiceWorkerRegister";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tipografía de display para el sitio de marketing (home/planes/login):
// pesos extra-gruesos y muy compactos para titulares "esculturales" -- el
// resto de la app (paneles /admin) sigue usando la fuente del sistema, esto
// solo se aplica donde se usa la clase `font-display`.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ERPSystem — El ERP que habla el idioma de tu país",
  description: "Inventario, ventas, facturación e impuestos configurados automáticamente según dónde operas.",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    // iOS no lee `manifest.webmanifest` para el modo standalone -- necesita
    // estas meta tags propias (Next las genera desde `appleWebApp`) además
    // del `apple-touch-icon` de abajo.
    capable: true,
    statusBarStyle: 'default',
    title: 'ERPSystem',
  },
  icons: {
    icon: [{ url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#1f40c9',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): ReactElement {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body>
        <ServiceWorkerRegister />
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
