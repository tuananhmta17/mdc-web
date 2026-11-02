import type { Metadata } from "next";
import "./globals.css";
import { StateProvider } from "@/lib/state-context";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "MTA Dance Crew (MDC) — Hệ Thống Quản Lý CLB",
  description: "Ứng dụng web quản lý bài nhảy, xếp lịch tập, giao việc truyền thông và điều hành Ban Chủ nhiệm MTA Dance Crew — Học viện Kỹ thuật Quân sự.",
  icons: {
    icon: "/logo-mdc.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-mdc-bg text-slate-100 antialiased selection:bg-mdc-red selection:text-white">
        <StateProvider>
          <AppShell>{children}</AppShell>
        </StateProvider>
      </body>
    </html>
  );
}
