import type { Metadata } from "next";
import "./globals.css";
import EnvironmentBadge from "@/components/EnvironmentBadge";
import FeedbackButton from "@/components/FeedbackButton";
import { ToastProvider } from "@/components/ToastProvider";
import SessionProvider from "@/components/SessionProvider";

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
      <body className="antialiased">
        <SessionProvider>
          <ToastProvider>
            <EnvironmentBadge />
            {children}
            <FeedbackButton />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
