import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EnvironmentBadge from "@/components/EnvironmentBadge";
import FeedbackButton from "@/components/FeedbackButton";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "日報アプリ",
  description: "作業日報を作成・管理するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EnvironmentBadge />
        <Navigation />
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
