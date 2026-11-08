import { openInkwell } from "./inkwell-test-helpers";
import { expect, test } from "./toolcraft-product-test";

test("browser: inkwell opens in the Toolcraft shell", async ({ page }) => {
  await openInkwell(page);
  await expect(page.getByRole("button", { exact: true, name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Wellington" })).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
});
