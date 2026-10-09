import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Galeria" };

export default function Page() {
  return <ComingSoon title="Galeria" subtitle="Fotos de partidas, eventos e bastidores." />;
}
