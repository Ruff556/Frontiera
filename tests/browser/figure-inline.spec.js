"use strict";
const { test, expect } = require("@playwright/test");

for (const width of [1440, 1280, 1024, 900, 768, 740, 739, 390]) {
  test(`figure inline: flusso, proporzioni e contenimento a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/demo/immagini-inline/");
    await page.evaluate(() => document.fonts.ready);
    // Carica tutte le immagini lazy, comprese quelle sotto il viewport.
    for (const img of await page.locator(".figura-inline img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveJSProperty("complete", true);
    }
    const report = await page.evaluate(() => {
      const body = document.querySelector(".articlebody");
      const bounds = body.getBoundingClientRect();
      const figures = [...body.querySelectorAll(":scope > .figura-inline")];
      const measure = f => {
        const rect = f.getBoundingClientRect();
        const img = f.querySelector("img");
        const image = img.getBoundingClientRect();
        const caption = f.querySelector("figcaption");
        return {width:rect.width, left:rect.left, right:rect.right, bottom:rect.bottom,
          float:getComputedStyle(f).cssFloat,
          ratio:image.width / image.height, naturalRatio:img.naturalWidth / img.naturalHeight,
          align:caption && getComputedStyle(caption).textAlign,
          captionGap:caption && caption.getBoundingClientRect().top - f.querySelector(".frame").getBoundingClientRect().bottom};
      };
      // I rettangoli delle righe provano il wrapping, non solo il valore CSS.
      const lines = [];
      const walker = document.createTreeWalker(figures[1].nextElementSibling, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) { const r = document.createRange(); r.selectNodeContents(walker.currentNode); lines.push(...[...r.getClientRects()].map(x => ({left:x.left,right:x.right,top:x.top}))); }
      const cleared = [...body.querySelectorAll(":scope > h2,:scope > h3,:scope > table,:scope > .schema-kit,:scope > .figura-clear")].every(el => {
        const preceding = figures.filter(f => f.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        return preceding.every(f => el.getBoundingClientRect().top >= f.getBoundingClientRect().bottom - 1);
      });
      const beforeReturn = figures[1].nextElementSibling.nextElementSibling.nextElementSibling;
      const range = document.createRange(); range.selectNodeContents(beforeReturn);
      return { body:bounds.toJSON(), figures:figures.map(measure), lines, cleared,
        returnLeft:range.getClientRects()[0].left,
        overflow:document.documentElement.scrollWidth > innerWidth,
        schemaWidth:body.querySelector(".schema-kit").getBoundingClientRect().width,
        invalid:body.querySelectorAll("p figure, .figura-inline [data-image-lightbox-trigger], .figura-inline [data-full-src]").length };
    });
    expect(report.overflow).toBe(false);
    expect(report.invalid).toBe(0);
    expect(report.cleared).toBe(true);
    expect(report.figures[0].width).toBeCloseTo(report.schemaWidth, 0);
    for (const figure of report.figures) {
      // naturalWidth è corretto per la densità di srcset e arrotondato dal browser.
      expect(Math.abs(figure.ratio / figure.naturalRatio - 1)).toBeLessThan(.005);
      expect(figure.bottom).toBeLessThanOrEqual(report.body.bottom + 1);
      expect(figure.left).toBeGreaterThanOrEqual(report.body.left - 1);
      expect(figure.right).toBeLessThanOrEqual(report.body.right + 1);
      if (figure.captionGap !== null) expect(figure.captionGap).toBeCloseTo(0, 0);
    }
    const halfFloats = width >= 740 && report.body.width >= 480;
    const largeFloats = width >= 740 && report.body.width >= 608;
    expect(report.figures[1].float).toBe(halfFloats ? "left" : "none");
    expect(report.figures[2].float).toBe(halfFloats ? "right" : "none");
    expect(report.figures[3].float).toBe(largeFloats ? "left" : "none");
    expect(report.figures[4].float).toBe(largeFloats ? "right" : "none");
    if (halfFloats) {
      expect(report.figures[1].width / report.body.width).toBeCloseTo(.47, 2);
      expect(report.lines[0].left).toBeGreaterThan(report.figures[1].right + 18);
      expect(report.returnLeft).toBeCloseTo(report.body.left, 0);
    }
    if (largeFloats) expect(report.figures[3].width / report.body.width).toBeCloseTo(.66, 2);
    expect(report.figures[2].align).toBe("right");
    expect(errors).toEqual([]);
    if (process.env.FIGURE_SCREENSHOTS && [1440,768,390,740].includes(width)) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({path:`docs/immagini-inline/screenshots/demo-${width}.png`,fullPage:true});
    }
  });
}

test("le figure consecutive non si affiancano e il lightbox F/P resta operativo", async ({ page }) => {
  await page.goto("/demo/immagini-inline/");
  expect(await page.locator(".figura-inline + .figura-clear + .figura-inline").evaluate(f => f.getBoundingClientRect().top >= f.previousElementSibling.previousElementSibling.getBoundingClientRect().bottom)).toBe(true);
  await expect(page.locator(".figura-inline .cap")).toHaveCount(8);
  await expect(page.locator(".figura-inline .credito-immagine-link")).toHaveCount(10);
  await page.goto("/fasi/manovra-fallita/");
  await expect(page.locator(".fasenav")).toBeVisible();
  await expect(page.locator(".crediti-iconografici")).toHaveCount(0);
  const trigger = page.locator("[data-image-lightbox-trigger]");
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  await page.goto("/profondita/asimmetria-iniziale-decisione-mancata/");
  await expect(page.locator(".fasenav")).toBeVisible();
  await expect(page.locator(".crediti-iconografici")).toHaveCount(0);
  await page.goto("/schede/starlink/");
  await expect(page.locator(".analisi-caption-rights")).toBeVisible();
  await expect(page.locator(".crediti-iconografici, .credito-immagine-link")).toHaveCount(0);
  await page.goto("/analisi/capacita-residua-bombardamento/");
  await expect(page.locator(".schema-kit").first()).toBeVisible();
  await expect(page.locator(".figura-inline")).toHaveCount(0);
});

const loyalWingman = "/analisi/loyal-wingman-combattimento-aereo-collaborativo/";

for (const width of [1440, 390]) {
  test(`Loyal Wingman: registro, figure e flusso a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(loyalWingman);
    await page.evaluate(() => document.fonts.ready);
    const registro = page.getByRole("region", { name: "Crediti iconografici" });
    await expect(registro).toBeVisible();
    await expect(registro).toHaveAttribute("data-section-navigation-ignore", "");
    await expect(page.locator(".articlebody + .crediti-iconografici")).toHaveCount(1);
    await expect(page.locator('.secnav a[href="#crediti-iconografici"]')).toHaveCount(0);
    await expect(page.locator(".figura-inline .rights, .analisi-caption-rights")).toHaveCount(0);
    await expect(page.locator(".figura-inline")).toHaveCount(11);
    const refs = await page.locator(".credito-immagine-link").evaluateAll(links => links.map(link => ({
      href: link.getAttribute("href"),
      text: link.textContent.trim(),
      label: link.getAttribute("aria-label"),
      iconHidden: link.querySelector("span")?.getAttribute("aria-hidden"),
      imageId: link.closest("figure").id,
    })));
    const entries = await registro.getByRole("listitem").evaluateAll(items => items.map(item => ({
      href: `#${item.id}`,
      number: item.querySelector(".crediti-iconografici-numero").textContent,
      back: item.querySelector('a[href^="#"]').getAttribute("href"),
    })));
    expect(new Set(refs.map(ref => ref.href)).size).toBe(12);
    expect(entries.map(({ href }) => href)).toEqual(refs.map(({ href }) => href));
    await expect(registro.locator(".crediti-iconografici-numero").first()).toHaveCSS("white-space", "nowrap");
    for (const [i, entry] of entries.entries()) {
      const number = String(i + 1).padStart(2, "0");
      expect(entry.number).toBe(number);
      expect(refs[i].text).toBe(`${number} ⓘ`);
      expect(refs[i].label).toBe(`Crediti iconografici dell’immagine ${number}`);
      expect(refs[i].iconHidden).toBe("true");
      expect(entry.back).toBe(`#${refs[i].imageId}`);
    }
    await expect(registro).not.toContainText(/https?:\/\//);
    await expect(registro).toContainText("License review needed");
    await expect(registro).toContainText("Illustrazione generata con AI per Frontiera e convertita in WebP.");
    await expect(registro.getByRole("link", { name: "Open Government Licence v3.0" }))
      .toHaveAttribute("href", "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/");
    await expect(registro.getByRole("link", { name: "Public Domain Mark 1.0" }))
      .toHaveAttribute("href", "https://creativecommons.org/publicdomain/mark/1.0/");

    const figure = page.locator(".figura-inline").first();
    await figure.scrollIntoViewIfNeeded();
    await expect(figure.locator("img")).toHaveJSProperty("complete", true);
    await expect(figure).toHaveCSS("float", width === 1440 ? "right" : "none");
    await expect(figure.locator("figcaption")).toHaveCSS("text-align", "right");
    const geometry = await figure.evaluate(fig => {
      const range = document.createRange();
      range.selectNodeContents(fig.nextElementSibling);
      return {
        image: fig.querySelector("img").getBoundingClientRect().toJSON(),
        figure: fig.getBoundingClientRect().toJSON(),
        caption: fig.querySelector("figcaption").getBoundingClientRect().toJSON(),
        firstLine: range.getClientRects()[0].toJSON(),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.image.height).toBeGreaterThan(geometry.caption.height);
    if (width === 1440) {
      expect(geometry.firstLine.top).toBeLessThan(geometry.figure.bottom);
      expect(geometry.firstLine.right).toBeLessThan(geometry.figure.left);
    } else {
      expect(geometry.firstLine.top).toBeGreaterThan(geometry.figure.bottom);
      await page.locator(".analisi-head-caption .credito-immagine-link").click();
      await expect(page.locator(".infobox-mobile-trigger")).toHaveClass(/is-visible/);
      await expect.poll(() => page.evaluate(() => {
        const heading = document.querySelector(".crediti-iconografici li:target h3");
        const trigger = document.querySelector(".infobox-mobile-trigger");
        return heading.getBoundingClientRect().top > trigger.getBoundingClientRect().bottom;
      })).toBe(true);
    }
  });
}

test.describe("navigazione nativa del registro", () => {
  test.use({ javaScriptEnabled: false });
  test("andata, focus e ritorno da tastiera", async ({ page }) => {
    await page.goto(loyalWingman);
    const ref = page.getByRole("link", { name: "Crediti iconografici dell’immagine 01", exact: true });
    await ref.focus();
    await page.keyboard.press("Enter");
    const item = page.locator(await ref.getAttribute("href"));
    await expect(item).toBeFocused();
    await expect(item).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(item.getByRole("link", { name: "Fonte originale" })).toBeFocused();
    await page.keyboard.press("Tab");
    const back = item.getByRole("link", { name: "Torna all’immagine" });
    await expect(back).toBeFocused();
    await page.keyboard.press("Enter");
    const cover = page.locator(await back.getAttribute("href"));
    await expect(cover).toBeFocused();
    await expect(cover).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(ref).toBeFocused();
  });
});

test("il corpo senza sidebar conserva la larghezza di lettura", async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({width, height:1000});
    await page.goto("/demo/immagini-inline/");
    const measured = await page.evaluate(() => {
      document.querySelector(".analisi-aside").remove();
      document.querySelector(".analisi-wrap").classList.add("analisi-wrap--single");
      const body = document.querySelector(".articlebody");
      return {width:body.getBoundingClientRect().width, overflow:document.documentElement.scrollWidth > innerWidth};
    });
    expect(measured.width).toBeGreaterThan(300);
    expect(measured.width).toBeLessThanOrEqual(608);
    expect(measured.overflow).toBe(false);
  }
});
