import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Apoie o clube" };

export default function Page() {
  return <ComingSoon title="Apoie o clube" subtitle="Saiba como contribuir com o Último Gole FC." />;
}
