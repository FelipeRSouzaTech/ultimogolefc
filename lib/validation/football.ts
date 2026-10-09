import { z } from "zod";
import { TIEBREAKERS } from "@/modules/competitions/standings";
import { MATCH_STATUSES } from "@/modules/matches/rules";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const score = z
  .string()
  .trim()
  .regex(/^\d{0,2}$/, "Informe um número entre 0 e 99.")
  .transform((value) => (value === "" ? null : Number(value)));

export const clubSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do clube.").max(80, "Nome muito longo."),
  shortName: optionalText(20, "Nome curto muito longo."),
  crestPath: z
    .string()
    .trim()
    .max(200, "Caminho muito longo.")
    .regex(/^(\/[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp|svg))?$/, "Use um caminho local de imagem, por exemplo /brand/escudo.png.")
    .transform((value) => (value === "" ? null : value)),
});

export const competitionSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da competição.").max(100, "Nome muito longo."),
  description: optionalText(2000, "Descrição muito longa."),
  isActive: z.boolean(),
});

const points = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `Informe os pontos por ${label}.` })
    .int("Use um número inteiro.")
    .min(0, "O valor não pode ser negativo.")
    .max(10, "Valor muito alto.");

export const seasonSchema = z.object({
  label: z.string().trim().min(1, "Informe a temporada, por exemplo 2026.").max(30, "Texto muito longo."),
  regulation: optionalText(20_000, "Regulamento muito longo."),
  pointsWin: points("vitória"),
  pointsDraw: points("empate"),
  pointsLoss: points("derrota"),
  tiebreakers: z.array(z.enum(TIEBREAKERS)).max(TIEBREAKERS.length),
  standingsMode: z.enum(["AUTO", "MANUAL"]),
  isCurrent: z.boolean(),
});

export const matchSchema = z.object({
  seasonId: z.string().trim().min(1, "Selecione a competição e a temporada."),
  homeTeamId: z.string().trim().min(1, "Selecione o mandante."),
  awayTeamId: z.string().trim().min(1, "Selecione o visitante."),
  kickoffAt: z.string().trim().min(1, "Informe data e horário."),
  venue: optionalText(120, "Local muito longo."),
  round: optionalText(40, "Rodada muito longa."),
  status: z.enum(MATCH_STATUSES, { errorMap: () => ({ message: "Selecione um status válido." }) }),
  homeScore: score,
  awayScore: score,
  notes: optionalText(5000, "Informações muito longas."),
});
