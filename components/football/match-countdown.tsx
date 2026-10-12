"use client";

import { useEffect, useState } from "react";
import { countdownParts, type Countdown } from "@/modules/matches/rules";

const UNITS: { key: keyof Omit<Countdown, "started">; label: string }[] = [
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
];

/**
 * Contagem regressiva até o início da partida, atualizada a cada segundo no navegador.
 * Antes de montar no navegador mostra traços (o horário do servidor e o do aparelho podem diferir).
 */
export function MatchCountdown({ kickoffIso }: { kickoffIso: string }) {
  const target = new Date(kickoffIso).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = now === null ? null : countdownParts(target, now);
  if (parts?.started) {
    return <p className="font-display text-lg font-extrabold uppercase tracking-wide">A partida já começou</p>;
  }

  return (
    // A cada segundo o leitor de tela anunciaria o valor; o texto completo fica no rótulo, sem aria-live.
    <dl className="flex items-start justify-center gap-4 sm:gap-6" aria-label="Tempo até o início da partida">
      {UNITS.map((unit) => (
        <div key={unit.key} className="min-w-[2.75rem] text-center">
          <dd className="font-display text-3xl font-extrabold tabular-nums leading-none sm:text-4xl">
            {parts === null ? "--" : unit.key === "days" ? parts.days : String(parts[unit.key]).padStart(2, "0")}
          </dd>
          <dt className="mt-1 text-[0.6875rem] font-bold uppercase tracking-wider opacity-80">{unit.label}</dt>
        </div>
      ))}
    </dl>
  );
}
