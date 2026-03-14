import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Debt Recovery Platform",
  description: "Core MVP (Phase 1): authentication and basic UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
