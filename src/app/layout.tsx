import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexi - Accredito - 0595495965265295952",
  description: "Pagamento in attessa di ricezione - Nexi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
