import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DebtPilot",
  description: "AI-powered debt recovery and collections platform.",
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
