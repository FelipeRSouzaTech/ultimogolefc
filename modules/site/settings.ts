// Conteúdo institucional configurável. Módulo puro: define as chaves, rótulos e regras de cada campo.

export type SettingKind = "text" | "longtext" | "url" | "email" | "imagePath";

export type SettingDef = {
  key: string;
  label: string;
  kind: SettingKind;
  max: number;
  hint?: string;
};

export type SettingGroup = { id: string; title: string; description: string; settings: SettingDef[] };

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "home",
    title: "Página inicial",
    description: "Banner principal. Deixe em branco para usar a apresentação padrão.",
    settings: [
      { key: "home.bannerTitle", label: "Título do banner", kind: "text", max: 80 },
      { key: "home.bannerDescription", label: "Descrição do banner", kind: "text", max: 200 },
      { key: "home.bannerLinkLabel", label: "Texto do botão", kind: "text", max: 30 },
      { key: "home.bannerLinkUrl", label: "Link do botão", kind: "url", max: 200, hint: "Endereço interno (ex.: /jogos) ou completo com https://." },
    ],
  },
  {
    id: "club",
    title: "Clube",
    description: "Textos da página institucional. Informe somente dados oficiais.",
    settings: [
      { key: "club.history", label: "História", kind: "longtext", max: 20000, hint: "Separe os parágrafos com uma linha em branco." },
      { key: "club.mission", label: "Missão e objetivos", kind: "longtext", max: 5000 },
      { key: "club.association", label: "Informações da associação", kind: "longtext", max: 5000 },
    ],
  },
  {
    id: "contact",
    title: "Contato e redes sociais",
    description: "Exibidos na página de contato e no rodapé.",
    settings: [
      { key: "contact.email", label: "E-mail oficial", kind: "email", max: 254 },
      { key: "contact.phone", label: "Telefone ou WhatsApp", kind: "text", max: 40 },
      { key: "contact.address", label: "Endereço", kind: "text", max: 200 },
      { key: "social.instagram", label: "Instagram", kind: "url", max: 200, hint: "Endereço completo com https://." },
      { key: "social.facebook", label: "Facebook", kind: "url", max: 200, hint: "Endereço completo com https://." },
      { key: "social.youtube", label: "YouTube", kind: "url", max: 200, hint: "Endereço completo com https://." },
    ],
  },
  {
    id: "support",
    title: "Apoio ao clube",
    description: "Página de apoio. A chave Pix só aparece no portal depois de preenchida aqui.",
    settings: [
      { key: "support.intro", label: "Formas de contribuição", kind: "longtext", max: 5000 },
      { key: "support.purpose", label: "Finalidade das contribuições", kind: "longtext", max: 5000 },
      { key: "support.pixKey", label: "Chave Pix", kind: "text", max: 140 },
      { key: "support.pixHolder", label: "Titular da chave Pix", kind: "text", max: 120 },
      { key: "support.qrCodePath", label: "QR Code (caminho da imagem)", kind: "imagePath", max: 200, hint: "Ex.: /brand/pix-qrcode.png." },
    ],
  },
  {
    id: "footer",
    title: "Rodapé",
    description: "Texto institucional curto exibido no rodapé.",
    settings: [{ key: "footer.text", label: "Texto do rodapé", kind: "text", max: 300 }],
  },
];

export const SETTING_DEFS: SettingDef[] = SETTING_GROUPS.flatMap((group) => group.settings);

const IMAGE_PATH = /^\/[A-Za-z0-9._\-/]+\.(png|jpg|jpeg|webp|svg)$/;
const INTERNAL_PATH = /^\/[A-Za-z0-9._\-/?=&%#]*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Aceita endereço interno ("/jogos") ou externo somente com https. Bloqueia javascript:, data: e afins. */
export function isSafeUrl(value: string): boolean {
  if (INTERNAL_PATH.test(value) && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isExternalUrl(value: string): boolean {
  return value.startsWith("https://");
}

/** Valida um valor conforme o tipo do campo. Devolve a mensagem de erro ou null. Vazio é sempre aceito. */
export function validateSetting(def: SettingDef, raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  if (value.length > def.max) return `Use no máximo ${def.max} caracteres.`;
  switch (def.kind) {
    case "url":
      return isSafeUrl(value) ? null : "Informe um endereço interno (iniciado por /) ou completo com https://.";
    case "email":
      return EMAIL.test(value) ? null : "Informe um e-mail válido.";
    case "imagePath":
      return IMAGE_PATH.test(value) ? null : "Use um caminho local de imagem, por exemplo /brand/imagem.png.";
    default:
      return null;
  }
}

export type Settings = Record<string, string>;

/** Monta o objeto de configurações a partir das linhas do banco; chaves desconhecidas são ignoradas. */
export function buildSettings(rows: readonly { key: string; value: string }[]): Settings {
  const known = new Set(SETTING_DEFS.map((def) => def.key));
  const settings: Settings = {};
  for (const def of SETTING_DEFS) settings[def.key] = "";
  for (const row of rows) {
    if (known.has(row.key)) settings[row.key] = row.value;
  }
  return settings;
}

/** Divide um texto longo em parágrafos (linha em branco como separador). */
export function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}
