import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lexon Agenda — Agendamento Inteligente para seu Negócio",
  description:
    "Automatize agendamentos via WhatsApp, reduza faltas e aumente seu faturamento. Plataforma completa para barbearias, clínicas, salões e estúdios.",
  keywords: [
    "agendamento online",
    "sistema de agendamento",
    "automação whatsapp",
    "agenda para barbearia",
    "SaaS agendamento",
    "gestão de agenda",
  ],
  openGraph: {
    title: "Lexon Agenda — Agendamento Inteligente",
    description:
      "Automatize agendamentos, reduza faltas e aumente seu faturamento com a plataforma mais completa do Brasil.",
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
        {children}
      </body>
    </html>
  );
}
