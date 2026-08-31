import type { Metadata } from "next";
import SalonLanding from "./SalonLanding";

export const metadata: Metadata = {
  title: "Agenda para salões de beleza | Lexon Agenda",
  description:
    "Uma agenda pensada para a rotina de salões de beleza: horários, profissionais e clientes no mesmo lugar.",
};

export default function SaloesPage() {
  return <SalonLanding />;
}
