"use strict";

const { test, expect } = require("@playwright/test");

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1366, height: 900 };
const ORIGIN = "http://127.0.0.1:4173";

async function expectSinglePressedFilter(page, label) {
  const state = await page.locator("#archfilters .chip").evaluateAll((chips) => ({
    pressed: chips.filter((chip) => chip.getAttribute("aria-pressed") === "true").map((chip) => chip.textContent.trim()),
    on: chips.filter((chip) => chip.classList.contains("on")).map((chip) => chip.textContent.trim()),
  }));
  expect(state.pressed).toEqual([label]);
  expect(state.on).toEqual([label]);
}

test.describe("A1 — menu mobile", () => {
  test.use({ viewport: MOBILE });

  test("stato chiuso, apertura, Escape e ritorno del focus", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator("#burger");
    const menu = page.locator("#mobilemenu");

    await expect(menu).not.toHaveClass(/\bopen\b/);
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(burger).toHaveAccessibleName("Apri menù");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(menu).toHaveAttribute("inert", "");

    await burger.focus();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("#mobilemenu").contains(document.activeElement))).toBe(false);

    await burger.click();
    await expect(burger).toHaveAttribute("aria-expanded", "true");
    await expect(burger).toHaveAccessibleName("Chiudi menù");
    await expect(menu).toHaveAttribute("aria-hidden", "false");
    expect(await menu.getAttribute("inert")).toBeNull();

    const firstLink = menu.locator("a").first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(burger).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveAttribute("aria-hidden", "true");
    await expect(menu).toHaveAttribute("inert", "");
    await expect(burger).toBeFocused();
    await expect(burger).toHaveAccessibleName("Apri menù");
  });
});

test.describe("A1 — percorso tastiera desktop", () => {
  test.use({ viewport: DESKTOP });

  test("il menu mobile chiuso non entra nel tab order", async ({ page }) => {
    await page.goto("/");
    const menu = page.locator("#mobilemenu");
    await expect(menu).toHaveAttribute("inert", "");
    await expect(menu).toHaveAttribute("aria-hidden", "true");

    await page.locator(".navlinks a").last().focus();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.querySelector("#mobilemenu").contains(document.activeElement))).toBe(false);
  });
});

test.describe("A4 — richiamo infobox mobile", () => {
  test.use({ viewport: MOBILE });

  test("End/Home aggiornano lo stato e il dialog restituisce il focus", async ({ page }) => {
    await page.goto("/fasi/manovra-fallita/");
    const trigger = page.locator(".infobox-mobile-trigger");
    const dialog = page.locator("#frontiera-infobox-mobile-dialog");

    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute("aria-hidden", "true");
    await expect(trigger).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("End");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(trigger).toHaveAttribute("aria-hidden", "false");
    await expect(trigger).toHaveAttribute("tabindex", "0");

    await page.keyboard.press("Control+Home");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(trigger).toHaveAttribute("aria-hidden", "true");
    await expect(trigger).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("End");
    await expect(trigger).toHaveAttribute("aria-hidden", "false");
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

test.describe("A5 — semantica e stati", () => {
  test.use({ viewport: MOBILE });

  test("il navigatore sezioni si apre e chiude da tastiera", async ({ page }) => {
    await page.goto("/fasi/manovra-fallita/");
    const capsule = page.locator(".secroll-capsule");
    await expect(capsule).toHaveAttribute("role", "button");
    expect(await capsule.getAttribute("aria-valuenow")).toBeNull();
    expect(await capsule.getAttribute("aria-haspopup")).toBeNull();
    await expect(capsule).toHaveAttribute("aria-expanded", "false");

    await capsule.focus();
    await expect(capsule).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(capsule).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#secroll-menu")).toHaveClass(/\bis-open\b/);
    await page.keyboard.press("Escape");
    await expect(capsule).toHaveAttribute("aria-expanded", "false");
    await expect(capsule).toBeFocused();
  });

  test("i filtri Attualità mantengono un solo aria-pressed coerente", async ({ page }) => {
    await page.goto("/archivio/attualita/");
    await expectSinglePressedFilter(page, "Tutto");

    const chips = page.locator("#archfilters .chip");
    const firstLabel = (await chips.nth(1).textContent()).trim();
    await chips.nth(1).click();
    await expectSinglePressedFilter(page, firstLabel);

    const secondLabel = (await chips.nth(2).textContent()).trim();
    await chips.nth(2).click();
    await expectSinglePressedFilter(page, secondLabel);
  });
});

test.describe("A3 — asset WebP", () => {
  test.use({ viewport: DESKTOP });

  test("gli asset rispondono e sono quelli usati da Starlink e da una cartina F", async ({ page, request }) => {
    for (const asset of [
      "/immagini/sistemi/s1-starlink-scena-labels-clean.webp",
      "/immagini/cartografia/ukraine-administrative-base.webp",
    ]) {
      const response = await request.get(asset);
      expect(response.ok(), `${asset} deve rispondere con successo`).toBe(true);
    }

    const localErrors = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === ORIGIN && (response.status() === 404 || response.status() >= 500)) {
        localErrors.push(`${response.status()} ${url.pathname}`);
      }
    });

    await page.goto("/schede/starlink/");
    await expect(page.locator('img[src="/immagini/sistemi/s1-starlink-scena-labels-clean.webp"]')).toHaveCount(1);
    await page.goto("/fasi/manovra-fallita/");
    await expect(page.locator('image[href="/immagini/cartografia/ukraine-administrative-base.webp"]')).toHaveCount(1);
    expect(localErrors).toEqual([]);
  });
});

test.describe("Tornata 5 — hover dei controlli Schema Kit", () => {
  test.use({ viewport: MOBILE, hasTouch: true, isMobile: true });

  test("un tap touch su AVANZA mantiene il contrasto e avanza STR1", async ({ page }) => {
    await page.goto("/analisi/capacita-residua-bombardamento/");
    const schema = page.locator("#schema-str1-penetrazione");
    const next = schema.locator('[data-str1-next]');

    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    await expect(next).toHaveText(/AVANZA/);

    const state = await page.evaluate(() => {
      const sheet = [...document.styleSheets]
        .find((candidate) => candidate.href && new URL(candidate.href).pathname === "/css/schema-kit.css");
      return {
        hoverCapability: window.matchMedia("(hover: hover)").matches,
        finePointer: window.matchMedia("(pointer: fine)").matches,
        hoverRuleScoped: Boolean(sheet && [...sheet.cssRules].some((rule) =>
          rule.conditionText === "(hover: hover) and (pointer: fine)"
          && [...rule.cssRules].some((nestedRule) => nestedRule.selectorText === ".schema-kit__button:hover"))),
      };
    });
    expect(state.hoverCapability).toBe(false);
    expect(state.finePointer).toBe(false);
    expect(state.hoverRuleScoped).toBe(true);

    await next.tap();
    await expect(schema.locator('[data-schema-count]')).toHaveText("01/03");

    await expect.poll(() => next.evaluate((button) => {
      const style = getComputedStyle(button);
      return { background: style.backgroundColor, border: style.borderColor, color: style.color };
    })).toEqual({
      background: "rgb(21, 60, 120)",
      border: "rgb(21, 60, 120)",
      color: "rgb(255, 255, 255)",
    });
  });

  test.describe("desktop con mouse", () => {
    test.use({ viewport: DESKTOP, hasTouch: false, isMobile: false });

    test("AVANZA conserva il suo hover desktop", async ({ page }) => {
      await page.goto("/analisi/capacita-residua-bombardamento/");
      const next = page.locator("#schema-str1-penetrazione [data-str1-next]");

      await next.hover();
      await expect.poll(() => next.evaluate((button) => {
        const style = getComputedStyle(button);
        return { background: style.backgroundColor, border: style.borderColor, color: style.color };
      })).toEqual({
        background: "rgb(18, 53, 104)",
        border: "rgb(12, 47, 98)",
        color: "rgb(255, 255, 255)",
      });
    });
  });
});

test.describe("leggibilità senza JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: DESKTOP });

  const samples = [
    ["homepage", "/", true],
    ["pagina F/P", "/fasi/manovra-fallita/", false],
    ["analisi", "/analisi/storm-shadow-ucraina-fabbrica-profondita/", false],
    ["scheda S", "/schede/starlink/", false],
  ];

  for (const [name, url, isHome] of samples) {
    test(name, async ({ page }) => {
      await page.goto(url);
      const main = page.locator("main");
      await expect(main).toBeVisible();
      await expect(main.locator("h1").first()).toBeVisible();
      expect((await main.innerText()).trim().length).toBeGreaterThan(100);
      expect(await main.locator("a[href]").count()).toBeGreaterThan(0);
      expect(await page.locator("footer nav a[href]").count()).toBeGreaterThanOrEqual(3);

      if (isHome) {
        const firstSlide = page.locator("#slides .slide").first();
        await expect(firstSlide).toBeVisible();
        expect(await firstSlide.locator("a[href]").count()).toBeGreaterThan(0);
      }
    });
  }
});
