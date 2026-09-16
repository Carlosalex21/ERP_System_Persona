import type { Metadata } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import type { ReactElement } from "react";
import NotificationProvider from "@/components/providers/NotificationProvider";
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
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
