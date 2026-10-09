import { z } from "zod";
import { NEWS_STATUSES } from "@/modules/news/rules";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(60, "Nome muito longo."),
});

export const newsSchema = z.object({
  title: z.string().trim().min(5, "O título deve ter pelo menos 5 caracteres.").max(160, "Título muito longo."),
  slug: z
    .string()
    .trim()
    .max(96, "Slug muito longo.")
    .regex(/^[a-z0-9-]*$/, "Use apenas letras minúsculas, números e hífens."),
  summary: z.string().trim().min(10, "O resumo deve ter pelo menos 10 caracteres.").max(300, "Resumo muito longo."),
  content: z.string().trim().min(20, "O conteúdo deve ter pelo menos 20 caracteres.").max(50_000, "Conteúdo muito longo."),
  categoryId: optionalText(40, "Categoria inválida."),
  authorName: optionalText(120, "Nome do autor muito longo."),
  seoTitle: optionalText(70, "O título SEO deve ter no máximo 70 caracteres."),
  seoDescription: optionalText(170, "A descrição SEO deve ter no máximo 170 caracteres."),
  status: z.enum(NEWS_STATUSES, { errorMap: () => ({ message: "Selecione um estado válido." }) }),
  publishedAt: z.string().trim(),
});

export type NewsFormValues = z.infer<typeof newsSchema>;
