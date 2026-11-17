import type { Metadata } from "next";
import { cormorant, cormorantItalic, manrope } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin | iDesignStudio.ro",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ro"
      className={`${cormorant.variable} ${cormorantItalic.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
