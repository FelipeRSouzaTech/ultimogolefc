import { z } from "zod";
import { ROLES } from "@/lib/auth/permissions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail muito longo.")
  .email("Informe um e-mail válido.");

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  .max(200, "A senha deve ter no máximo 200 caracteres.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha.").max(200, "Senha muito longa."),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  email: emailSchema,
  role: z.enum(ROLES, { errorMap: () => ({ message: "Selecione uma função válida." }) }),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Nome muito longo."),
  role: z.enum(ROLES, { errorMap: () => ({ message: "Selecione uma função válida." }) }),
  isActive: z.boolean(),
});
