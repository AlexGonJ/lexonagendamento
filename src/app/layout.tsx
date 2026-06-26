import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agendamento Inteligente",
  description: "Plataforma premium de agendamento online e gestão.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0a0a0c] text-[#f3f4f6]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
