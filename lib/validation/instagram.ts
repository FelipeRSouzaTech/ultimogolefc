import { z } from "zod";
import { captionError, CAPTION_MAX_CHARS, INSTAGRAM_FORMATS, INSTAGRAM_WHEN, isJpegPath, parseUserTags, userTagsError } from "@/modules/instagram/rules";

export const instagramPostSchema = z
  .object({
    format: z.enum(INSTAGRAM_FORMATS, { errorMap: () => ({ message: "Escolha feed ou story." }) }),
    imagePath: z
      .string()
      .trim()
      .min(1, "Escolha a imagem da publicação.")
      .max(200, "Caminho muito longo.")
      .regex(/^\/(?!\/)[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp)$/, "Envie uma imagem pelo campo acima.")
      .refine(isJpegPath, "O Instagram só aceita imagens JPEG (.jpg). Converta a imagem e envie de novo."),
    caption: z
      .string()
      .max(CAPTION_MAX_CHARS + 500, "Legenda muito longa.")
      .transform((value) => value.replace(/\r\n/g, "\n").trim())
      .transform((value) => (value === "" ? null : value)),
    userTags: z.string().max(1000, "Lista de marcações muito longa.").default("").transform(parseUserTags),
    showTagsOnImage: z.boolean().default(true),
    when: z.enum(INSTAGRAM_WHEN, { errorMap: () => ({ message: "Escolha quando publicar." }) }),
    scheduledAt: z.string().trim().max(20),
  })
  .superRefine((data, ctx) => {
    const error = captionError(data.format, data.caption);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caption"], message: error });
    const tagsError = userTagsError(data.format, data.userTags);
    if (tagsError) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["userTags"], message: tagsError });
    if (data.when === "SCHEDULE" && data.scheduledAt === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledAt"], message: "Informe data e horário." });
    }
  });

export type InstagramPostInput = z.infer<typeof instagramPostSchema>;
