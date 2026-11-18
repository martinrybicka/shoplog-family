import { expect, test } from "@playwright/test";
import path from "node:path";

const password = "Synthetic-Shopping-Test-2026!";
test.beforeAll(async ({ request }) => {
  const token = (await (await request.get("/api/v1/auth/csrf/")).json())
    .csrf_token;
  const status = await (await request.get("/api/v1/auth/setup/")).json();
  if (status.available) {
    const result = await request.post("/api/v1/auth/setup/", {
      headers: { "X-CSRFToken": token },
      data: {
        setup_token: "synthetic-e2e-installation-token-1234567890",
        username: "e2eadmin",
        display_name: "Zkušební rodina",
        password,
        password_confirmation: password,
      },
    });
    expect(result.status()).toBe(201);
  }
});
test.beforeEach(async ({ page }) => {
  await page.goto("/prihlaseni");
  await page.getByLabel("Uživatelské jméno", { exact: true }).fill("e2eadmin");
  await page.getByLabel("Heslo", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Přihlásit se", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nákupy pod kontrolou." }),
  ).toBeVisible();
});
test("Ruční nákup, položky, oprava, filtry a smazání", async ({
  page,
}, info) => {
  const store = `Syntetický obchod ${info.project.name} ${Date.now()}`;
  await page.goto("/uctenka");
  await page.getByRole("button", { name: "Zapsat nákup ručně" }).click();
  await page.getByLabel("Obchod", { exact: true }).fill(store);
  await page.getByLabel("Zaplacená částka (Kč)").fill("103,63");
  await page.getByRole("button", { name: "Přidat položku" }).click();
  await page.getByLabel("Název", { exact: true }).fill("Syntetická jablka");
  await page.getByLabel("Množství", { exact: true }).fill("0,125");
  await page.getByLabel("Cena za jednotku (Kč)").fill("29,00");
  await page.getByRole("button", { name: "Uložit nákup", exact: true }).click();
  await expect(page.getByRole("heading", { name: store })).toBeVisible();
  await expect(page.getByText("100,00", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Upravit nákup", exact: true }).click();
  await page.getByLabel("Zaplacená částka (Kč)").fill("99,99");
  await page.getByRole("button", { name: "Uložit změny", exact: true }).click();
  await expect(page.getByRole("heading", { name: store })).toBeVisible();
  await page.goto("/historie");
  await page.getByLabel("Hledat obchod nebo poznámku").fill(store);
  await page.getByRole("link").filter({ hasText: store }).click();
  await page.getByRole("button", { name: "Smazat", exact: true }).click();
  await page.getByRole("button", { name: "Smazat nákup", exact: true }).click();
  await expect(page).toHaveURL(/\/historie$/);
  await page.getByLabel("Hledat obchod nebo poznámku").fill(store);
  await expect(
    page.getByRole("heading", { name: "Žádný nákup nenalezen" }),
  ).toBeVisible();
});
test("Fotografie, lokální OCR, soukromý archiv a mobilní rozložení", async ({
  page,
}, info) => {
  await page.goto("/uctenka");
  await page
    .getByLabel("Fotografie účtenky")
    .setInputFiles(path.resolve("../.runtime/receipt.png"));
  await expect(
    page.getByRole("heading", { name: "Údaje o nákupu" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rozpoznat údaje", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Použít návrhy ve formuláři" })
    .click();
  await expect(page.getByLabel("Zaplacená částka (Kč)")).toHaveValue("1234.50");
  await expect(page.getByLabel("Datum nákupu")).toHaveValue("2026-01-10");
  await page
    .getByLabel("Obchod", { exact: true })
    .fill(`Syntetická samoobsluha ${info.project.name}`);
  await page.getByRole("button", { name: "Uložit nákup", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: `Syntetická samoobsluha ${info.project.name}`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Účtenka z obchodu/ }),
  ).toBeVisible();
  const receipt = await page
    .getByRole("img", { name: /Účtenka z obchodu/ })
    .getAttribute("src");
  expect((await page.request.get(receipt!)).headers()["cache-control"]).toBe(
    "private, no-store",
  );
  await page.goto("/");
  await page.getByLabel("Rok", { exact: true }).fill("2026");
  await page.getByLabel("Měsíc", { exact: true }).selectOption("01");
  await expect(
    page
      .getByText(`Syntetická samoobsluha ${info.project.name}`, { exact: true })
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../.runtime/home-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Odhlásit se", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Přihlásit se", exact: true }),
  ).toBeVisible();
  expect((await page.request.get(receipt!)).status()).toBe(403);
});

test("Přístupnost přehledu a formuláře", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const mode of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: mode });
    for (const route of ["/", "/uctenka"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const result = await new AxeBuilder({ page }).analyze();
      expect(
        result.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
  }
});
