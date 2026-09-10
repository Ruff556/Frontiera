"use strict";

const { test, expect } = require("@playwright/test");
// reducedMotion è un'opzione del BrowserContext, non una fixture del runner.
test.use({ contextOptions: { reducedMotion: "reduce" } });
const URL = "/analisi/lyman-contesa-posizioni-sostegno/";
const ROOT = "#schema-str2-saliente";
const KEYS = ["upper", "center", "lower"];
const EXPECTED = [
  { mode: "off", moment: 0, nodes: [100, 100, 100], ssa: 100 },
  { mode: "direct", moment: 0, nodes: [100, 100, 100], ssa: 85 },
  { mode: "combined", moment: 1, nodes: [100, 100, 100], ssa: 85 },
  { mode: "combined", moment: 2, nodes: [0, 70, 70], ssa: 72 },
  { mode: "combined", moment: 3, nodes: [0, 70, 0], ssa: 45 },
  { mode: "combined", moment: 4, nodes: [0, 30, 0], ssa: 18 }
];

async function open(page) {
  await page.goto(URL);
  await expect(page.locator(ROOT)).toHaveAttribute("data-str2-ready", "true");
  await page.locator("[data-str2-canvas]").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
}
async function settled(page) {
  await expect(page.locator(ROOT)).toHaveAttribute("data-str2-settled", "true", { timeout: 10000 });
}
async function snapshot(page) {
  return page.locator(ROOT).evaluate((root) => {
    const find = (s) => root.querySelector(s);
    const keys = ["upper", "center", "lower"];
    const x = (s) => find(s).transform.baseVal.consolidate().matrix.e;
    const opacity = (s) => Number(getComputedStyle(find(s)).opacity);
    return {
      mode: root.dataset.str2Mode, moment: Number(root.dataset.str2Moment), phase: root.dataset.str2Phase,
      nodes: keys.map(k => Number(find(`[data-str2-node-meter="${k}"]`).getAttribute("aria-valuenow"))),
      fills: keys.map(k => Number(find(`[data-str2-node-fill="${k}"]`).style.transform.match(/scaleX\(([^)]+)/)[1])),
      ssa: Number(find("[data-str2-ssa-meter]").getAttribute("aria-valuenow")),
      salient: opacity("[data-str2-salient]"),
      blue: keys.map(k => x(`[data-str2-blue="${k}"]`)),
      red: keys.map(k => opacity(`[data-str2-node="${k}"]`)),
      supplies: keys.map(k => opacity(`[data-str2-supply="${k}"]`)),
      rear: keys.map(k => opacity(`[data-str2-rear-link="${k}"]`)),
      vectors: Object.fromEntries(Array.from(root.querySelectorAll("[data-str2-vector]"), e => [e.dataset.str2Vector, Number(getComputedStyle(e).opacity)])),
      svgNodes: keys.every(k => find(`[data-str2-node="${k}"]`).namespaceURI === "http://www.w3.org/2000/svg"),
      svgTexts: find("[data-str2-canvas]").querySelectorAll("text").length,
      copy: find("[data-str2-reading-text]").textContent,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
}
async function checkState(page, index, initialBlue) {
  await settled(page);
  const state = await snapshot(page);
  const expected = EXPECTED[index];
  expect(state.mode).toBe(expected.mode);
  expect(state.moment).toBe(expected.moment);
  expect(state.nodes).toEqual(expected.nodes);
  expect(state.ssa).toBe(expected.ssa);
  expect(state.fills).toEqual(expected.nodes.map(n => n / 100));
  expect(state.red).toEqual([1, 1, 1]);
  expect(state.rear).toEqual([1, 1, 1]);
  expect(state.svgNodes).toBe(true);
  expect(state.svgTexts).toBe(9);
  expect(state.pageOverflow).toBe(false);
  expect(state.blue[0]).toBeGreaterThan(state.blue[1]);
  expect(state.blue[2]).toBeGreaterThan(state.blue[1]);
  if (index < 5) {
    expect(state.salient).toBe(1);
    expect(state.blue).toEqual(initialBlue);
    expect(state.supplies).toEqual(expected.nodes.map(n => n / 100));
  } else {
    expect(state.salient).toBeLessThanOrEqual(.05);
    state.blue.forEach((x, i) => expect(x).toBeGreaterThan(initialBlue[i]));
    expect(state.copy).toContain("alimentate, protette e mantenute");
    expect(state.phase).toBe("final");
  }
  if (index === 0 || index === 5) expect(Object.values(state.vectors).every(v => v === 0)).toBe(true);
  if (index === 1) {
    expect(state.vectors["center-salient"]).toBe(1);
    expect(state.vectors["upper-node"]).toBe(0);
    expect(state.vectors["lower-node"]).toBe(0);
  }
  if (index === 2) {
    expect(state.vectors["center-salient"]).toBe(1);
    expect(state.vectors["upper-node"]).toBe(1);
    expect(state.vectors["lower-node"]).toBe(1);
  }
}

test("STR2: integrazione nel punto richiesto, HTML SVG valido e asset condizionali", async ({ page }) => {
  await open(page);
  await expect(page.locator(ROOT)).toHaveCount(1);
  const previous = await page.locator(ROOT).evaluate(root => root.previousElementSibling.textContent);
  expect(previous).toContain("Se il primo ciclo corre abbastanza più rapidamente del secondo");
  expect(previous.trim().endsWith("senza che la difesa scompaia.")).toBe(true);
  await expect(page.locator(`${ROOT} [data-str2-moment]`)).toHaveCount(4);
  await expect(page.locator(`${ROOT} .str2-schema__legend li`)).toHaveCount(9);
  await expect(page.locator(`${ROOT} .str2-schema__caption`)).toContainText("non sono misurazioni storiche");
  const svg = await page.locator("[data-str2-canvas]").evaluate(e => ({
    red: e.querySelectorAll("[data-str2-node]").length,
    blue: e.querySelectorAll("[data-str2-blue]").length,
    bad: e.querySelectorAll("p, div").length
  }));
  expect(svg).toEqual({ red: 3, blue: 3, bad: 0 });
  await page.goto("/analisi/capacita-residua-bombardamento/");
  await expect(page.locator('script[src="/js/schema-str2.js"]')).toHaveCount(0);
  await expect(page.locator('link[href="/css/schema-str2.css"]')).toHaveCount(0);
  await expect(page.locator('[data-schema-kit="str1-allocazione-penetrazione"]')).toHaveCount(1);
});

for (const width of [1440, 768, 500, 390, 308]) {
  test(`STR2: tre cicli reversibili, geometria e controlli a ${width}px`, async ({ page }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", e => { if (e.type() === "error") errors.push(e.text()); });
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const initialBlue = (await snapshot(page)).blue;
    await checkState(page, 0, initialBlue);
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let i = 1; i <= 5; i++) {
        await page.locator("[data-str2-next]").click();
        await checkState(page, i, initialBlue);
      }
      for (let i = 4; i >= 0; i--) {
        await page.locator("[data-str2-back]").click();
        await checkState(page, i, initialBlue);
      }
    }
    const bounds = await page.locator(ROOT).evaluate(root => {
      const rect = root.getBoundingClientRect();
      return {
        overflow: root.scrollWidth > root.clientWidth + 1,
        controls: Array.from(root.querySelectorAll("button"), e => e.getBoundingClientRect()).map(r => ({ w: r.width, h: r.height, inside: r.left >= rect.left && r.right <= rect.right })),
        clippedLabels: Array.from(root.querySelectorAll("button")).flatMap(button => {
          const box = button.getBoundingClientRect();
          const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
          const clipped = [];
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue;
            const range = document.createRange();
            range.selectNode(walker.currentNode);
            if (Array.from(range.getClientRects()).some(r => r.left < box.left || r.right > box.right)) clipped.push(walker.currentNode.textContent);
          }
          return clipped;
        }),
        baseGap: root.querySelector('[data-str2-blue="center"]').getBoundingClientRect().left - root.querySelector('[data-str2-base="blue"] rect').getBoundingClientRect().right,
        svg: root.querySelector("svg").getBoundingClientRect().width,
        font: getComputedStyle(root.querySelector("[data-str2-salient-label]")).fontSize
      };
    });
    expect(bounds.overflow).toBe(false);
    expect(bounds.controls.every(b => b.w >= 44 && b.h >= 44 && b.inside)).toBe(true);
    expect(bounds.clippedLabels).toEqual([]);
    expect(bounds.baseGap).toBeGreaterThan(5);
    expect(bounds.font).toBe("11px");
    expect(errors).toEqual([]);
  });
}

test.describe("STR2: animazione reale", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" }, viewport: { width: 1440, height: 1100 } });

  async function samplesForClick(page, selector) {
    return page.evaluate(async (selector) => {
      const root = document.querySelector("#schema-str2-saliente");
      const at = (s) => root.querySelector(s);
      const x = () => at('[data-str2-blue="center"]').transform.baseVal.consolidate().matrix.e;
      const samples = [];
      at(selector).click();
      await new Promise(resolve => {
        const collect = () => {
          samples.push({ phase: root.dataset.str2Phase, ssa: Number(at("[data-str2-ssa-value]").textContent),
            upper: Number(at('[data-str2-node-value="upper"]').textContent),
            center: Number(at('[data-str2-node-value="center"]').textContent),
            lower: Number(at('[data-str2-node-value="lower"]').textContent),
            fill: at('[data-str2-node-fill="center"]').style.transform,
            salient: Number(at("[data-str2-salient]").getAttribute("opacity")), x: x()
          });
          if (root.dataset.str2Settled === "true") resolve();
          else requestAnimationFrame(collect);
        };
        requestAnimationFrame(collect);
      });
      return samples;
    }, selector);
  }

  test("barre continue e ordine vincolante: sostegno, perdita, avanzata", async ({ page }) => {
    await open(page);
    await page.locator('button[data-str2-moment="1"]').click();
    await settled(page);
    const second = await samplesForClick(page, '[data-str2-moment="2"]');
    expect(new Set(second.map(s => s.upper)).size).toBeGreaterThan(15);
    expect(second.some(s => s.upper > 0 && s.upper < 100)).toBe(true);
    expect(second.at(-1).ssa).toBe(72);
    const third = await samplesForClick(page, '[data-str2-moment="3"]');
    expect(new Set(third.map(s => s.lower)).size).toBeGreaterThan(15);
    expect(new Set(third.map(s => s.ssa)).size).toBeGreaterThan(15);
    expect(third.every(s => s.salient === 1)).toBe(true);
    const x = third.at(-1).x;
    const fourth = await samplesForClick(page, '[data-str2-moment="4"]');
    expect(new Set(fourth.map(s => s.fill)).size).toBeGreaterThan(40);
    expect(fourth.some(s => s.center < 70 && s.center > 30)).toBe(true);
    expect(fourth.filter(s => s.salient < 1).every(s => s.center === 30)).toBe(true);
    expect(fourth.filter(s => s.x > x + .01).every(s => s.salient <= .05)).toBe(true);
    const phases = [...new Set(fourth.map(s => s.phase))];
    expect(phases).toEqual(["collapse", "loss", "advance", "final"]);
    expect(fourth.at(-1).x).toBeGreaterThan(x);
    await expect(page.locator("[data-str2-next]")).toHaveText(/Rivedi/);
  });

  for (const phase of ["collapse", "loss", "advance"]) {
    test(`interrompere ${phase} ripristina integralmente il momento 3`, async ({ page }) => {
      await open(page);
      await page.locator('button[data-str2-moment="3"]').click();
      await settled(page);
      const before = await snapshot(page);
      await page.locator('button[data-str2-moment="4"]').click();
      await expect(page.locator(ROOT)).toHaveAttribute("data-str2-phase", phase, { timeout: 7000 });
      await page.waitForTimeout(150);
      await page.locator("[data-str2-back]").click();
      await checkState(page, 4, before.blue);
      await page.waitForTimeout(1200);
      await checkState(page, 4, before.blue);
    });
  }

  test("sospensione fuori viewport e pagina nascosta conservano il progresso", async ({ page }) => {
    await open(page);
    await page.locator('button[data-str2-moment="3"]').click();
    await settled(page);
    await page.locator('button[data-str2-moment="4"]').click();
    await page.waitForTimeout(350);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator(ROOT)).toHaveAttribute("data-str2-suspended", "true");
    const paused = await snapshot(page);
    await page.waitForTimeout(500);
    expect((await snapshot(page)).fills).toEqual(paused.fills);
    await page.locator("[data-str2-canvas]").scrollIntoViewIfNeeded();
    await expect(page.locator(ROOT)).toHaveAttribute("data-str2-suspended", "false");
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const hidden = await snapshot(page);
    await page.waitForTimeout(500);
    expect((await snapshot(page)).fills).toEqual(hidden.fills);
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settled(page);
    expect((await snapshot(page)).phase).toBe("final");
  });

  test("selezione diretta, ridimensionamento e comandi rapidi non lasciano residui", async ({ page }) => {
    await open(page);
    await page.locator('button[data-str2-moment="4"]').click();
    await expect(page.locator(ROOT)).toHaveAttribute("data-str2-phase", "collapse");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator("[data-str2-canvas]").scrollIntoViewIfNeeded();
    await settled(page);
    expect((await snapshot(page)).phase).toBe("final");
    await page.evaluate(async () => {
      const root = document.querySelector("#schema-str2-saliente");
      for (let i = 0; i < 12; i++) {
        root.querySelector(`[data-str2-moment="${i % 4 + 1}"]`).click();
        await new Promise(r => requestAnimationFrame(r));
      }
      root.querySelector('[data-str2-mode="off"]').click();
    });
    await settled(page);
    const off = await snapshot(page);
    await page.waitForTimeout(1300);
    expect(await snapshot(page)).toEqual(off);
    expect(off.ssa).toBe(100);
    expect(off.nodes).toEqual([100, 100, 100]);
    expect(off.salient).toBe(1);
  });
});

test("STR2: tastiera, focus e movimento ridotto mantengono la sequenza causale", async ({ page }) => {
  await open(page);
  await page.locator('button[data-str2-mode="off"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('button[data-str2-mode="direct"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await settled(page);
  await expect(page.locator('button[data-str2-mode="direct"]')).toHaveAttribute("aria-pressed", "true");
  const outline = await page.locator('button[data-str2-mode="direct"]').evaluate(e => getComputedStyle(e).outlineStyle);
  expect(outline).not.toBe("none");
  await page.locator('button[data-str2-moment="1"]').focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Space");
  await expect(page.locator(ROOT)).toHaveAttribute("data-str2-phase", "collapse");
  await expect(page.locator("[data-str2-salient]")).toHaveAttribute("opacity", "1.0000");
  const before = (await snapshot(page)).blue;
  await expect(page.locator(ROOT)).toHaveAttribute("data-str2-phase", "loss");
  const loss = await snapshot(page);
  expect(loss.salient).toBe(.05);
  expect(loss.blue).toEqual(before);
  await settled(page);
  expect((await snapshot(page)).blue[1]).toBeGreaterThan(before[1]);
  await expect(page.locator("[data-schema-live]")).toContainText("alimentate, protette e mantenute");
});

test("STR2: senza JavaScript il campo iniziale e la nota restano leggibili", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173" + URL);
  await expect(page.locator(ROOT)).toBeVisible();
  await expect(page.locator("[data-str2-canvas] [data-str2-node]")).toHaveCount(3);
  await expect(page.locator("[data-str2-ssa-value]")).toHaveText("100");
  await expect(page.locator(ROOT + " noscript p")).toContainText("abilita JavaScript");
  await expect(page.locator("[data-str2-mode=off]")).toBeHidden();
  await context.close();
});
