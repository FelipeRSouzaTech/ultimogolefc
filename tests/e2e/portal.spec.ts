import { expect, test } from "@playwright/test";

// Estes testes exigem a aplicação em execução com banco migrado (veja docs/STATUS.md).

test.describe("portal público", () => {
  test("página inicial mostra o clube e as seções principais", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Último Gole FC" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Próximo jogo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Últimos resultados" })).toBeVisible();
  });

  test("página de jogos tem o título e os filtros exigidos", async ({ page }) => {
    await page.goto("/jogos");
    await expect(page.getByRole("heading", { level: 1, name: "Próximos jogos" })).toBeVisible();
    await expect(page.getByText("Acompanhe os próximos jogos do Último Gole FC.")).toBeVisible();
    await expect(page.getByLabel("Competição")).toBeVisible();
    await expect(page.getByLabel("Temporada")).toBeVisible();
    await expect(page.getByLabel("Status")).toBeVisible();
  });

  test("páginas de resultados, competições e notícias respondem", async ({ page }) => {
    for (const [path, title] of [
      ["/resultados", "Resultados"],
      ["/competicoes", "Competições"],
      ["/noticias", "Notícias"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    }
  });

  test("não há rolagem horizontal na página de jogos", async ({ page }) => {
    await page.goto("/jogos");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("navegação mobile abre o menu e leva à página de jogos", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Somente no projeto mobile.");
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Jogos" }).click();
    await expect(page).toHaveURL(/\/jogos$/);
  });
});

test.describe("proteção do painel", () => {
  test("rotas administrativas redirecionam visitantes para o login", async ({ page }) => {
    for (const path of ["/admin", "/admin/noticias", "/admin/jogos", "/admin/usuarios", "/admin/auditoria"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Painel administrativo" })).toBeVisible();
  });

  test("login com credenciais inválidas mostra erro e não entra", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail").fill("ninguem@exemplo.com");
    await page.getByLabel("Senha").fill("senha-incorreta-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toContainText("E-mail ou senha inválidos.");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("cookie de sessão forjado não dá acesso", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "ug_session", value: "token-forjado", url: baseURL ?? "http://localhost:3000" }]);
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
