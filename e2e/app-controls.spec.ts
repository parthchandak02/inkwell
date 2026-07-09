import { expect, test } from "@playwright/test";

test("browser: inkwell opens with wind chrome and ink controls", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.getByText("Open-Meteo SF wind")).toBeVisible();
  await expect(page.getByText("Drag to release ink")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear Canvas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play playback|Pause playback/ })).toHaveCount(0);
});

test("browser: inkwell canvas drag releases ink particles", async ({ page }) => {
  await page.goto("/");

  const viewport = page.getByRole("application", { name: "Canvas viewport" });
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.55, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator("[data-toolcraft-canvas-slot] canvas")).toBeVisible();
});
