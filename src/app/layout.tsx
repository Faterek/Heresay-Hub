import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { I18nProvider } from "~/hooks/useI18n";

export const metadata: Metadata = {
  title: "Hearsay Hub",
  description:
    "Share memorable quotes from your friends, colleagues, or anyone whose words deserve to be remembered.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <SessionProvider>
          <TRPCReactProvider>
            <I18nProvider>{children}</I18nProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
