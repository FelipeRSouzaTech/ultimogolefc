import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Patrocinadores" };

export default function Page() {
  return <ComingSoon title="Patrocinadores" subtitle="Empresas e parceiros que apoiam o Último Gole FC." />;
}
