// Executado uma vez quando o servidor do Next.js inicia.
// Liga o agendador interno das publicações do Instagram: a cada minuto, o próprio servidor chama a rota
// /api/cron/instagram (com o CRON_SECRET), que publica o que já passou do horário. Assim não é preciso
// configurar cron externo quando o portal roda em servidor próprio (npm run dev, npm start, Docker).
// Regras de quando ele liga: internalSchedulerEnabled (modules/instagram/rules.ts) e docs/INSTAGRAM.md.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { internalSchedulerEnabled, INTERNAL_SCHEDULER_INTERVAL_MS } = await import("@/modules/instagram/rules");
  if (!internalSchedulerEnabled(process.env)) return;

  // Em desenvolvimento o módulo pode ser recarregado: um único agendador por processo.
  const state = globalThis as unknown as { __instagramScheduler?: boolean };
  if (state.__instagramScheduler) return;
  state.__instagramScheduler = true;

  const url = `http://127.0.0.1:${process.env.PORT ?? "3000"}/api/cron/instagram`;
  let running = false;
  let warned = false;

  const tick = async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      if (!warned) console.warn("[instagram] agendador interno parado: defina CRON_SECRET no .env.");
      warned = true;
      return;
    }
    // Um disparo por vez; a reserva em publishPost também impede publicação duplicada entre processos.
    if (running) return;
    running = true;
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55_000) });
      if (!response.ok) {
        console.warn(`[instagram] agendador interno: a rota respondeu ${response.status}.`);
        return;
      }
      const summary = (await response.json()) as { processed?: { id: string; status: string }[] };
      if (summary.processed?.length) {
        console.info(`[instagram] agendador: ${summary.processed.map((item) => `${item.id}=${item.status}`).join(", ")}`);
      }
    } catch (error) {
      console.warn("[instagram] agendador interno não conseguiu chamar a rota", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), INTERNAL_SCHEDULER_INTERVAL_MS);
  timer.unref?.();
  console.info("[instagram] agendador interno ligado (confere a fila a cada minuto).");
}
