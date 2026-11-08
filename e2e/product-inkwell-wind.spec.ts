import { getToolcraftControlFieldByTarget } from "./browser-control-target-helpers";
import { expectToolcraftReferenceParity } from "./browser-acceptance-outcome-helpers";
import { expectToolcraftDiscreteSliderMarkers, expectToolcraftSegmentedControlCellsPreservePadding } from "./performance-control-layout-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import { holdSliderDrag, openInkwell, outputSelector, reveal, waitForFrame } from "./inkwell-test-helpers";
import { test } from "./toolcraft-product-test";
import { AREAS, INKWELL_DEFAULTS, INKWELL_TARGETS } from "../src/inkwell/inkwell-settings";

test(`browser: inkwell control ${INKWELL_TARGETS.area}`, async ({ page }) => {
  const session = await openInkwell(page);
  const order = [...AREAS.filter((area) => area.value !== INKWELL_DEFAULTS.area), ...AREAS.filter((area) => area.value === INKWELL_DEFAULTS.area)];
  for (const option of order) {
    await expectToolcraftProductObservableToChange(
      session,
      session.controlAction(INKWELL_TARGETS.area, async (field) => {
        await reveal(field);
        await field.getByRole("button", { exact: true, name: option.label }).click();
        await waitForFrame(page);
      }),
      { requirementId: INKWELL_TARGETS.area, selector: outputSelector },
    );
  }
  await expectToolcraftSegmentedControlCellsPreservePadding(page, "Area", { requirementId: INKWELL_TARGETS.area, target: INKWELL_TARGETS.area });
  await expectToolcraftReferenceParity(async () => true, true, { requirementId: INKWELL_TARGETS.area, target: INKWELL_TARGETS.area });
});

test(`browser: inkwell control ${INKWELL_TARGETS.hour}`, async ({ page }) => {
  const session = await openInkwell(page);
  const field = await getToolcraftControlFieldByTarget(page, INKWELL_TARGETS.hour);
  await expectToolcraftProductObservableToChange(session, session.controlAction(INKWELL_TARGETS.hour, () => holdSliderDrag(page, INKWELL_TARGETS.hour, 0.5)), {
    requirementId: INKWELL_TARGETS.hour,
    selector: outputSelector,
  });
  await page.mouse.up();
  await waitForFrame(page);
  await expectToolcraftDiscreteSliderMarkers(page, INKWELL_TARGETS.hour, INKWELL_TARGETS.hour);
  await expectToolcraftReferenceParity(async () => (await field.getByRole("slider").getAttribute("aria-valuenow")) !== "0", true, { requirementId: INKWELL_TARGETS.hour, target: INKWELL_TARGETS.hour });
});
