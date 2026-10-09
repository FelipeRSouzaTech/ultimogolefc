import { z } from "zod";
import { isSafeUrl } from "@/modules/site/settings";
import { SPONSOR_TIERS } from "@/modules/sponsors/rules";
import { POSITIONS, STAFF_GROUPS } from "@/modules/squad/rules";
import { emailSchema } from "./auth";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const imagePath = z
  .string()
  .trim()
  .max(200, "Caminho muito longo.")
  .regex(/^(\/[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp|svg))?$/, "Use um caminho local de imagem, por exemplo /brand/imagem.png.")
  .transform((value) => (value === "" ? null : value));

const externalUrl = z
  .string()
  .trim()
  .max(200, "Endereço muito longo.")
  .refine((value) => value === "" || (value.startsWith("https://") && isSafeUrl(value)), "Informe o endereço completo, iniciado por https://.")
  .transform((value) => (value === "" ? null : value));

const sortOrder = z.coerce.number({ invalid_type_error: "Informe um número." }).int("Use um número inteiro.").min(0, "Use zero ou mais.").max(9999, "Valor muito alto.");

export const athleteSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  nickname: optionalText(60, "Apelido muito longo."),
  position: z.enum(POSITIONS, { errorMap: () => ({ message: "Selecione a posição." }) }),
  shirtNumber: z
    .string()
    .trim()
    .regex(/^\d{0,2}$/, "Informe um número entre 0 e 99.")
    .transform((value) => (value === "" ? null : Number(value))),
  bio: optionalText(3000, "Biografia muito longa."),
  photoPath: imagePath,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  isPublished: z.boolean(),
});

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  role: z.string().trim().min(2, "Informe o cargo.").max(80, "Cargo muito longo."),
  group: z.enum(STAFF_GROUPS, { errorMap: () => ({ message: "Selecione o grupo." }) }),
  sortOrder,
  isPublished: z.boolean(),
});

export const sponsorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(100, "Nome muito longo."),
  tier: z.enum(SPONSOR_TIERS, { errorMap: () => ({ message: "Selecione a categoria." }) }),
  description: optionalText(1000, "Descrição muito longa."),
  logoPath: imagePath,
  websiteUrl: externalUrl,
  instagramUrl: externalUrl,
  startsAt: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida."),
  endsAt: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data inválida."),
  sortOrder,
  isActive: z.boolean(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe o seu nome.").max(120, "Nome muito longo."),
  email: emailSchema,
  subject: z.string().trim().min(3, "Informe o assunto.").max(150, "Assunto muito longo."),
  message: z.string().trim().min(10, "A mensagem deve ter pelo menos 10 caracteres.").max(5000, "A mensagem deve ter no máximo 5.000 caracteres."),
});
