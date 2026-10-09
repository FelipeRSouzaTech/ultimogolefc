import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Futebol" };

export default function Page() {
  return <ComingSoon title="Futebol" subtitle="Elenco e comissão técnica do Último Gole FC." />;
}
