import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Contato" };

export default function Page() {
  return <ComingSoon title="Contato" subtitle="Fale com o Último Gole FC." />;
}
