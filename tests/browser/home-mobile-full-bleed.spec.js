"use strict";

const { test, expect } = require("@playwright/test");

const viewports = [
  { name: "portrait 390x844", viewport: { width: 390, height: 844 } },
  { name: "portrait 412x915", viewport: { width: 412, height: 915 } },
  { name: "landscape 844x390", viewport: { width: 844, height: 390 } },
];

async function tapWithoutNavigation(target) {
  await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const init = {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      clientX: rect.left + 8,
      clientY: rect.top + 8,
    };
    element.dispatchEvent(new PointerEvent("pointerdown", init));
    element.dispatchEvent(new PointerEvent("pointerup", init));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

for (const context of viewports) {
  test.describe(`scrollport homepage mobile ${context.name}`, () => {
    test.use({ viewport: context.viewport, isMobile: true, hasTouch: true });

    test("mantiene il gutter editoriale e scorre fino ai bordi sicuri", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForFunction(() =>
        document.querySelector("[data-sistemi-track].sistemi-grid--cluster")
      );

      const geometry = await page.evaluate(() => {
        const tracks = [
          ...document.querySelectorAll(".linea-fasi, [data-sistemi-track].sistemi-grid--cluster"),
        ];
        return tracks.map((track) => {
          const section = track.closest(".wrap");
          const sectionStyle = getComputedStyle(section);
          const trackStyle = getComputedStyle(track);
          const sectionRect = section.getBoundingClientRect();
          const trackRect = track.getBoundingClientRect();
          const first = track.firstElementChild;
          const firstRect = first.getBoundingClientRect();
          const gutter = Number.parseFloat(sectionStyle.paddingLeft);
          const leftInset = Number.parseFloat(trackStyle.scrollPaddingInlineStart);
          const rightBleed = -Number.parseFloat(trackStyle.marginRight);
          const expectedLeft = sectionRect.left + section.clientLeft + gutter - leftInset;
          const expectedRight =
            sectionRect.right - section.clientLeft - Number.parseFloat(sectionStyle.paddingRight) + rightBleed;
          const expectedFirst = sectionRect.left + section.clientLeft + gutter;
          return {
            kind: track.matches(".linea-fasi") ? "timeline" : "systems",
            gutter,
            trackLeft: trackRect.left,
            trackRight: trackRect.right,
            expectedLeft,
            expectedRight,
            firstLeft: firstRect.left,
            expectedFirst,
            leftInset,
            paddingLeft: Number.parseFloat(trackStyle.paddingLeft),
          };
        });
      });

      expect(geometry).toHaveLength(3);
      for (const item of geometry) {
        expect(Math.abs(item.trackLeft - item.expectedLeft), `${item.kind} edge sinistro`).toBeLessThan(1.25);
        expect(Math.abs(item.trackRight - item.expectedRight), `${item.kind} edge destro`).toBeLessThan(1.25);
        expect(Math.abs(item.firstLeft - item.expectedFirst), `${item.kind} gutter iniziale`).toBeLessThan(1.25);
        expect(item.leftInset).toBeCloseTo(item.paddingLeft, 1);
      }

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        "il documento non deve avere overflow orizzontale"
      ).toBe(true);

      const tracks = [
        ...await page.locator(".linea-fasi").all(),
        await page.locator("[data-sistemi-track].sistemi-grid--cluster").first(),
      ];
      for (const track of tracks) {
        const canScroll = await track.evaluate((element) => element.scrollWidth > element.clientWidth);
        if (!canScroll) continue;
        await track.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
        const before = await track.evaluate((element) => {
          const section = element.closest(".wrap");
          return {
            snap: element.style.scrollSnapType,
            gutter: Number.parseFloat(getComputedStyle(section).paddingLeft),
          };
        });
        const intermediate = await track.evaluate((element, shift) => {
          element.style.scrollSnapType = "none";
          element.scrollLeft = shift;
          const card = element.firstElementChild;
          const cardRect = card.getBoundingClientRect();
          const portRect = element.getBoundingClientRect();
          return {
            scrollLeft: element.scrollLeft,
            cardLeft: cardRect.left,
            portLeft: portRect.left,
            visibleWidth: Math.max(
              0,
              Math.min(cardRect.right, portRect.right) - Math.max(cardRect.left, portRect.left)
            ),
          };
        }, Math.max(4, before.gutter * 0.7));
        const atEdge = await track.evaluate((element, shift) => {
          element.scrollLeft = shift;
          const card = element.firstElementChild;
          const cardRect = card.getBoundingClientRect();
          const portRect = element.getBoundingClientRect();
          const edgeX = portRect.left + 1;
          const edgeY = cardRect.top + cardRect.height / 2;
          const hit = document.elementFromPoint(edgeX, edgeY);
          return {
            cardLeft: cardRect.left,
            cardRight: cardRect.right,
            portLeft: portRect.left,
            edgeX,
            edgeY,
            hit: hit?.tagName + (hit?.className ? `.${hit.className}` : ""),
            visibleAtEdge: hit?.closest(".lf, .sistema-cluster") === card,
          };
        }, before.gutter + 4);

        expect(intermediate.scrollLeft).toBeGreaterThan(0);
        expect(intermediate.cardLeft).toBeLessThan(before.gutter);
        expect(intermediate.cardLeft).toBeGreaterThan(intermediate.portLeft);
        expect(intermediate.visibleWidth).toBeGreaterThan(0);
        expect(atEdge.cardLeft).toBeLessThan(atEdge.portLeft);
        expect(atEdge.cardRight).toBeGreaterThan(atEdge.portLeft);
        expect(atEdge.visibleAtEdge, JSON.stringify(atEdge)).toBe(true);

        await track.evaluate((element, originalSnap) => {
          element.style.scrollSnapType = originalSnap;
          element.scrollLeft = 0;
        }, before.snap);
      }

      const promoted = [
        ...await page.locator(".linea-fasi").all(),
        await page.locator("[data-sistemi-track].sistemi-grid--cluster").first(),
      ];
      for (let index = 0; index < promoted.length; index += 1) {
        const track = promoted[index];
        const itemSelector = index < 2 ? ":scope > .lf" : ":scope > .sistema-cluster";
        const second = track.locator(itemSelector).nth(1);
        await tapWithoutNavigation(second.locator("a").first());
        const expected = await second.evaluate((item) => {
          const track = item.parentElement;
          const itemRect = item.getBoundingClientRect();
          if (item === track.lastElementChild) {
            const maximum = Math.max(0, track.scrollWidth - track.clientWidth);
            return maximum > 0
              ? track.getBoundingClientRect().right - itemRect.width
              : itemRect.left;
          }
          const section = track.closest(".wrap");
          return section.getBoundingClientRect().left + section.clientLeft +
            Number.parseFloat(getComputedStyle(section).paddingLeft);
        });
        await expect.poll(() => second.evaluate((element, restingPosition) =>
          Math.abs(element.getBoundingClientRect().left - restingPosition), expected
        ), {
          timeout: 1500,
          message: "la cella protagonista deve tornare alla posizione di riposo prevista",
        }).toBeLessThan(1.25);
      }

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        "il documento resta privo di overflow orizzontale dopo le interazioni"
      ).toBe(true);
    });
  });
}
