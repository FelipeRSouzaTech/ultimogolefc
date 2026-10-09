import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth/permissions";
import { athleteSchema, contactSchema, sponsorSchema } from "@/lib/validation/site";
import { isContactRateLimited } from "@/modules/site/contact";
import { buildSettings, isSafeUrl, paragraphs, SETTING_DEFS, validateSetting } from "@/modules/site/settings";
import { groupByTier, isSponsorVisible } from "@/modules/sponsors/rules";
import { displayName, groupByPosition } from "@/modules/squad/rules";

const def = (key: string) => {
  const found = SETTING_DEFS.find((item) => item.key === key);
  if (!found) throw new Error(`chave inexistente: ${key}`);
  return found;
};

describe("configurações do site", () => {
  it("tem chaves únicas", () => {
    const keys = SETTING_DEFS.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("aceita endereços internos e https; bloqueia esquemas perigosos", () => {
    expect(isSafeUrl("/jogos")).toBe(true);
    expect(isSafeUrl("https://exemplo.com/pagina")).toBe(true);
    expect(isSafeUrl("http://exemplo.com")).toBe(false);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,x")).toBe(false);
    expect(isSafeUrl("//exemplo.com")).toBe(false);
    expect(isSafeUrl("exemplo.com")).toBe(false);
  });

  it("valida cada tipo de campo e sempre aceita vazio", () => {
    expect(validateSetting(def("home.bannerLinkUrl"), "")).toBeNull();
    expect(validateSetting(def("home.bannerLinkUrl"), "javascript:alert(1)")).toBeTruthy();
    expect(validateSetting(def("contact.email"), "contato@exemplo.com")).toBeNull();
    expect(validateSetting(def("contact.email"), "sem-arroba")).toBeTruthy();
    expect(validateSetting(def("support.qrCodePath"), "/brand/pix.png")).toBeNull();
    expect(validateSetting(def("support.qrCodePath"), "https://exemplo.com/pix.png")).toBeTruthy();
    expect(validateSetting(def("footer.text"), "x".repeat(301))).toBeTruthy();
  });

  it("monta as configurações com padrão vazio e ignora chaves desconhecidas", () => {
    const settings = buildSettings([
      { key: "support.pixKey", value: "chave-de-teste" },
      { key: "chave.desconhecida", value: "x" },
    ]);
    expect(settings["support.pixKey"]).toBe("chave-de-teste");
    expect(settings["club.history"]).toBe("");
    expect("chave.desconhecida" in settings).toBe(false);
  });

  it("divide textos em parágrafos", () => {
    expect(paragraphs("Um.\n\nDois.\r\n\r\n\r\nTrês.")).toEqual(["Um.", "Dois.", "Três."]);
    expect(paragraphs("   ")).toEqual([]);
  });
});

describe("patrocinadores", () => {
  const now = new Date("2026-10-09T15:00:00Z");
  const past = new Date("2026-01-01T00:00:00Z");
  const future = new Date("2027-01-01T00:00:00Z");

  it("exibe somente ativos dentro da vigência", () => {
    expect(isSponsorVisible({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isSponsorVisible({ isActive: true, startsAt: past, endsAt: future }, now)).toBe(true);
    expect(isSponsorVisible({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(isSponsorVisible({ isActive: true, startsAt: future, endsAt: null }, now)).toBe(false);
    expect(isSponsorVisible({ isActive: true, startsAt: null, endsAt: past }, now)).toBe(false);
  });

  it("agrupa por categoria na ordem master → institucionais e respeita a ordem de exibição", () => {
    const groups = groupByTier([
      { name: "Zeta", tier: "SUPPORTER", sortOrder: 2 },
      { name: "Alfa", tier: "SUPPORTER", sortOrder: 2 },
      { name: "Beta", tier: "SUPPORTER", sortOrder: 1 },
      { name: "Principal", tier: "MASTER", sortOrder: 0 },
    ]);
    expect(groups.map((group) => group.tier)).toEqual(["MASTER", "SUPPORTER"]);
    expect(groups[1]?.sponsors.map((sponsor) => sponsor.name)).toEqual(["Beta", "Alfa", "Zeta"]);
  });

  it("exige https nos links e valida datas", () => {
    const base = { name: "Parceiro", tier: "OFFICIAL", description: "", logoPath: "", websiteUrl: "", instagramUrl: "", startsAt: "", endsAt: "", sortOrder: "0", isActive: true };
    expect(sponsorSchema.safeParse(base).success).toBe(true);
    expect(sponsorSchema.safeParse({ ...base, websiteUrl: "https://exemplo.com" }).success).toBe(true);
    expect(sponsorSchema.safeParse({ ...base, websiteUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(sponsorSchema.safeParse({ ...base, websiteUrl: "/interno" }).success).toBe(false);
    expect(sponsorSchema.safeParse({ ...base, startsAt: "09/10/2026" }).success).toBe(false);
    expect(sponsorSchema.safeParse({ ...base, tier: "OURO" }).success).toBe(false);
  });
});

describe("elenco", () => {
  const athletes = [
    { name: "Carlos Souza", nickname: "Carlão", position: "FORWARD", shirtNumber: 9 },
    { name: "Bruno Lima", nickname: null, position: "GOALKEEPER", shirtNumber: 12 },
    { name: "André Reis", nickname: null, position: "GOALKEEPER", shirtNumber: 1 },
    { name: "Zeca", nickname: null, position: "FORWARD", shirtNumber: null },
  ];

  it("usa o apelido como nome de exibição quando existe", () => {
    expect(displayName(athletes[0]!)).toBe("Carlão");
    expect(displayName(athletes[1]!)).toBe("Bruno Lima");
    expect(displayName({ name: "Nome", nickname: "  " })).toBe("Nome");
  });

  it("agrupa por posição, na ordem do campo, e ordena por número da camisa", () => {
    const groups = groupByPosition(athletes);
    expect(groups.map((group) => group.label)).toEqual(["Goleiros", "Atacantes"]);
    expect(groups[0]?.athletes.map((athlete) => athlete.shirtNumber)).toEqual([1, 12]);
    expect(groups[1]?.athletes.map((athlete) => athlete.name)).toEqual(["Carlos Souza", "Zeca"]);
  });

  it("valida o cadastro de jogador", () => {
    const base = { name: "Jogador", nickname: "", position: "DEFENDER", shirtNumber: "", bio: "", photoPath: "", status: "ACTIVE", isPublished: false };
    const ok = athleteSchema.safeParse(base);
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.shirtNumber).toBeNull();
    expect(athleteSchema.safeParse({ ...base, shirtNumber: "100" }).success).toBe(false);
    expect(athleteSchema.safeParse({ ...base, position: "LIBERO" }).success).toBe(false);
    expect(athleteSchema.safeParse({ ...base, photoPath: "https://exemplo.com/a.png" }).success).toBe(false);
  });
});

describe("contato", () => {
  const valid = { name: "Pessoa", email: "Pessoa@Exemplo.com", subject: "Assunto", message: "Mensagem com tamanho suficiente." };

  it("valida e normaliza a mensagem", () => {
    const parsed = contactSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("pessoa@exemplo.com");
    expect(contactSchema.safeParse({ ...valid, email: "invalido" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "curta" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "x".repeat(5001) }).success).toBe(false);
  });

  it("limita envios por IP e no total", () => {
    expect(isContactRateLimited(0, 0)).toBe(false);
    expect(isContactRateLimited(2, 10)).toBe(false);
    expect(isContactRateLimited(3, 10)).toBe(true);
    expect(isContactRateLimited(null, 10)).toBe(false);
    expect(isContactRateLimited(null, 40)).toBe(true);
  });
});

describe("permissões das novas áreas", () => {
  it("editor altera conteúdo institucional; gestor de futebol e consulta apenas leem", () => {
    expect(can("EDITOR", "content:write")).toBe(true);
    expect(can("FOOTBALL_MANAGER", "content:write")).toBe(false);
    expect(can("FOOTBALL_MANAGER", "content:read")).toBe(true);
    expect(can("VIEWER", "content:write")).toBe(false);
  });

  it("mensagens de contato ficam restritas a administradores", () => {
    expect(can("SUPERADMIN", "messages:manage")).toBe(true);
    expect(can("ADMIN", "messages:manage")).toBe(true);
    expect(can("EDITOR", "messages:manage")).toBe(false);
    expect(can("FOOTBALL_MANAGER", "messages:manage")).toBe(false);
    expect(can("VIEWER", "messages:manage")).toBe(false);
  });
});
