import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { holdSliderDrag, openInkwell, outputSelector, reveal, waitForFrame } from "./inkwell-test-helpers";
import { expect, test } from "./toolcraft-product-test";
import { INKWELL_TARGETS, CITY_PRESETS } from "../src/inkwell/inkwell-settings";

for (const [target, ratio] of [[INKWELL_TARGETS.latitude, 0.3], [INKWELL_TARGETS.longitude, 0.8]] as const) {
  test(`browser: inkwell control ${target}`, async ({ page }) => {
    const session = await openInkwell(page);
    const field = await getToolcraftControlFieldByTarget(page, target);
    const before = await field.getByRole("slider").getAttribute("aria-valuenow");
    await expectToolcraftProductObservableToChange(session, session.controlAction(target, () => holdSliderDrag(page, target, ratio)), { requirementId: target, selector: outputSelector });
    await page.mouse.up();
    await waitForFrame(page);
    await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== before, true, { requirementId: target, target });
  });
}

test(`browser: inkwell control ${INKWELL_TARGETS.cityPreset}`, async ({ page }) => {
  const session = await openInkwell(page);
  const order = [...CITY_PRESETS.slice(1), CITY_PRESETS[0]];
  for (const city of order) {
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(INKWELL_TARGETS.cityPreset, async (field) => {
        await reveal(field);
        await field.getByRole("button", { exact: true, name: city.label }).click();
        await waitForFrame(page);
      }),
      { requirementId: INKWELL_TARGETS.cityPreset, selector: outputSelector },
    );
    await expect((await getToolcraftControlFieldByTarget(page, INKWELL_TARGETS.latitude)).getByRole("slider")).toHaveAttribute("aria-valuenow", String(city.latitude));
  }
  await expectToolcraftReferenceParity(
    async () => (await getToolcraftControlFieldByTarget(page, INKWELL_TARGETS.longitude)).getByRole("slider").getAttribute("aria-valuenow"),
    String(CITY_PRESETS[0].longitude),
    { requirementId: INKWELL_TARGETS.cityPreset, target: INKWELL_TARGETS.cityPreset },
  );
});
