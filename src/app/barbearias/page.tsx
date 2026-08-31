import type { Metadata } from "next";
import BarberLanding from "./BarberLanding";

export const metadata: Metadata = {
  title: "Agenda para barbearias | Lexon Agenda",
  description: "Uma agenda direta para barbearias organizarem horários, equipe e clientes.",
};

export default function BarbeariasPage() {
  return <BarberLanding />;
}
