import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Full variable weight range (tokens.json: 200-800) fed into the
// --font-bricolage var the .sq-display/.sq-headline/.sq-title utilities and
// font-bricolage utility read, instead of overriding body via .className.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
});

// Geist Mono — identifiers, coordinates, order references (.sq-mono).
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "TraceCart — On trouvera un moyen.",
  description: "Sourcing et logistique transfrontalière, pour les corridors commerciaux les plus difficiles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${bricolage.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
