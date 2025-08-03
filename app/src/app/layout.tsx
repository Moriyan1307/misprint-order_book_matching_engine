import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Book Prototype",
  description: "A minimal demo of an order book matching engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100">{children}</body>
    </html>
  );
}
