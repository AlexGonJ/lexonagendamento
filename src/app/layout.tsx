import type { Metadata } from "next";
import "./globals.css";
import MetaPixel from "@/components/MetaPixel";

export const metadata: Metadata = {
  title: "Lexon Agenda — Agendamento Inteligente para seu Negócio",
  description:
    "Uma plataforma de agendamento para organizar serviços, profissionais e atendimentos do seu negócio.",
  keywords: [
    "agendamento online",
    "sistema de agendamento",
    "automação por whatsapp",
    "agenda para barbearia",
    "SaaS agendamento",
    "gestão de agenda",
  ],
  openGraph: {
    title: "Lexon Agenda — Agendamento Inteligente",
    description:
      "Organize serviços, profissionais e agendamentos em uma só plataforma.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#0a0a0c] text-[#f3f4f6]"
        suppressHydrationWarning
      >
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
